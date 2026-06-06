import { NextResponse } from 'next/server';
import { connectMongoServer } from '@/lib/mongoServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = new Set([
  'tab_switch',
  'window_blur',
  'minimize',
  'fullscreen_exit',
  'copy',
  'paste',
  'right_click',
  'selection',
]);

export async function POST(
  req: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;
    const body = await req.json();
    const type = String(body.type || '').trim();
    const message = String(body.message || '').slice(0, 200);

    if (!ALLOWED.has(type)) {
      return NextResponse.json({ success: false, error: 'Invalid violation type' }, { status: 400 });
    }

    await connectMongoServer();
    const TestSession = (await import('@/backend/models/TestSession.js')).default;

    const session = await TestSession.findOne({ sessionId, status: 'active' });
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found or closed' }, { status: 404 });
    }

    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      session.status = 'void';
      await session.save();
      return NextResponse.json({ success: false, error: 'Session expired' }, { status: 410 });
    }

    session.violations.push({ type, message, at: new Date() });
    await session.save();

    const violationCount = session.violations.length;
    const autoSubmit = violationCount >= 3;

    return NextResponse.json({
      success: true,
      data: {
        violationCount,
        autoSubmit,
        warningLevel: violationCount,
      },
    });
  } catch (e) {
    console.error('skills/sessions/violations error:', e);
    return NextResponse.json({ success: false, error: 'Could not log violation' }, { status: 500 });
  }
}
