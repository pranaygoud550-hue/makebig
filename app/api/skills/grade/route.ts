import { NextResponse } from 'next/server';
import { gradeSkillExam, toVerifiedSkillRecord } from '@/lib/skillVerification/exam';
import { calculateIntegrityScore } from '@/lib/skillVerification/integrity';
import { calculateFinalSkillScore } from '@/lib/skillVerification/finalScore';
import { badgeFromScore } from '@/lib/skillVerification/scoring';
import { verifyAuthFromRequest } from '@/lib/verifyAuthToken';
import { connectMongoServer } from '@/lib/mongoServer';
import { findUserByContact } from '@/lib/userUpsert.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const skillId = String(body.skillId || '').trim();
    const sessionId = String(body.sessionId || '').trim();
    const mcqAnswers = Array.isArray(body.mcqAnswers) ? body.mcqAnswers.map(Number) : [];
    const practicalAnswers = Array.isArray(body.practicalAnswers)
      ? body.practicalAnswers.map(Number)
      : [];
    const autoSubmitted = Boolean(body.autoSubmitted);

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Test session required — restart verification' },
        { status: 400 }
      );
    }

    await connectMongoServer();
    const TestSession = (await import('@/backend/models/TestSession.js')).default;
    const session = await TestSession.findOne({ sessionId, skillId });

    if (!session) {
      return NextResponse.json({ success: false, error: 'Invalid test session' }, { status: 400 });
    }

    if (session.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Session already submitted' }, { status: 409 });
    }

    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      session.status = 'void';
      await session.save();
      return NextResponse.json({ success: false, error: 'Session expired' }, { status: 410 });
    }

    const base = gradeSkillExam(skillId, mcqAnswers, practicalAnswers);
    if (!base) {
      return NextResponse.json(
        { success: false, error: 'Invalid submission — complete all questions' },
        { status: 400 }
      );
    }

    const integrity = calculateIntegrityScore({
      violations: session.violations || [],
      proctoringLogs: session.proctoringLogs || [],
      webcamConsent: Boolean(session.webcamConsent),
    });

    const testScore = base.testScore;
    const finalScore = calculateFinalSkillScore(testScore, integrity.score);
    const badge = badgeFromScore(finalScore);

    const result = {
      ...base,
      testScore,
      integrityScore: integrity.score,
      score: finalScore,
      verified: finalScore >= 50,
      ...badge,
      proctorFlags: integrity.flags,
      suspicious: integrity.suspicious,
      sessionId,
    };

    session.testScore = testScore;
    session.integrityScore = integrity.score;
    session.finalScore = finalScore;
    session.mcqScore = base.mcqScore;
    session.practicalScore = base.practicalScore;
    session.proctorFlags = integrity.flags;
    session.suspicious = integrity.suspicious;
    session.mcqAnswers = mcqAnswers;
    session.practicalAnswers = practicalAnswers;
    session.submittedAt = new Date();
    session.status = autoSubmitted
      ? 'auto_submitted'
      : integrity.suspicious
        ? 'flagged'
        : 'submitted';
    await session.save();

    const auth = await verifyAuthFromRequest(req);
    const contact = auth?.contact || session.contact;
    if (contact) {
      const User = (await import('@/backend/models/User.js')).default;
      const existingUser = await findUserByContact(contact);
      if (existingUser?._id) {
        const record = toVerifiedSkillRecord(result);
        const doc = await User.findById(existingUser._id);
        if (doc) {
          const kept = (doc.verifiedSkills || []).filter(
            (s: { skillId: string }) => s.skillId !== skillId
          );
          doc.verifiedSkills = [
            ...kept,
            { ...record, verifiedAt: new Date(record.verifiedAt) },
          ];
          const verifiedNames = doc.verifiedSkills
            .filter((s: { score: number }) => s.score >= 50)
            .map((s: { skillName: string }) => s.skillName.toLowerCase());
          doc.skills = [...new Set([...(doc.skills || []), ...verifiedNames])];
          await doc.save();
        }
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    console.error('skills/grade error:', e);
    return NextResponse.json({ success: false, error: 'Could not grade test' }, { status: 500 });
  }
}
