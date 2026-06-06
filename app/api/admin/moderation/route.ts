import { NextResponse } from 'next/server';
import { connectMongoServer } from '@/lib/mongoServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAdmin(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET || process.env.MAKEBIG_ADMIN_KEY || '';
  if (!secret) return false;
  const header = req.headers.get('x-admin-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return header === secret;
}

export async function GET(req: Request) {
  if (!isAdmin(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectMongoServer();
    const TestSession = (await import('@/backend/models/TestSession.js')).default;

    const flagged = await TestSession.find({
      $or: [{ suspicious: true }, { status: 'flagged' }, { status: 'auto_submitted' }],
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    const sessions = flagged.map((s) => ({
      sessionId: s.sessionId,
      contact: s.contact,
      skillId: s.skillId,
      status: s.status,
      testScore: s.testScore,
      integrityScore: s.integrityScore,
      finalScore: s.finalScore,
      violationCount: (s.violations || []).length,
      proctorFlags: s.proctorFlags || [],
      suspicious: s.suspicious,
      submittedAt: s.submittedAt,
      createdAt: s.createdAt,
    }));

    return NextResponse.json({ success: true, data: { sessions } });
  } catch (e) {
    console.error('admin/moderation error:', e);
    return NextResponse.json({ success: false, error: 'Could not load moderation data' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!isAdmin(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const sessionId = String(body.sessionId || '').trim();
    const action = String(body.action || '').trim();

    if (!sessionId || !['approve', 'void'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }

    await connectMongoServer();
    const TestSession = (await import('@/backend/models/TestSession.js')).default;

    const session = await TestSession.findOne({ sessionId });
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    if (action === 'approve') {
      session.status = 'submitted';
      session.suspicious = false;
    } else {
      session.status = 'void';
    }
    await session.save();

    return NextResponse.json({ success: true, data: { sessionId, status: session.status } });
  } catch (e) {
    console.error('admin/moderation PATCH error:', e);
    return NextResponse.json({ success: false, error: 'Could not update session' }, { status: 500 });
  }
}
