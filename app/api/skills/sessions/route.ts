import { NextResponse } from 'next/server';
import { connectMongoServer } from '@/lib/mongoServer';
import { generateSessionId, SESSION_DURATION_MS } from '@/lib/skillVerification/sessionUtils';
import { getSkillById } from '@/lib/skillVerification/exam';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const skillId = String(body.skillId || '').trim();
    const contact = String(body.contact || '').trim().toLowerCase();
    const webcamConsent = Boolean(body.webcamConsent);

    if (!getSkillById(skillId)) {
      return NextResponse.json({ success: false, error: 'Unknown skill' }, { status: 400 });
    }

    await connectMongoServer();
    const TestSession = (await import('@/backend/models/TestSession.js')).default;

    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await TestSession.create({
      sessionId,
      contact,
      skillId,
      webcamConsent,
      expiresAt,
      status: 'active',
    });

    return NextResponse.json({
      success: true,
      data: { sessionId, skillId, expiresAt: expiresAt.toISOString() },
    });
  } catch (e) {
    console.error('skills/sessions error:', e);
    return NextResponse.json({ success: false, error: 'Could not start session' }, { status: 500 });
  }
}
