import { NextResponse } from 'next/server';
import { connectMongoServer } from '@/lib/mongoServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = new Set([
  'face_present',
  'no_face',
  'multiple_faces',
  'looking_away',
  'frequent_disappearance',
  'excessive_head_movement',
]);

export async function POST(
  req: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;
    const body = await req.json();
    const type = String(body.type || '').trim();
    const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};

    if (!ALLOWED.has(type)) {
      return NextResponse.json({ success: false, error: 'Invalid proctoring type' }, { status: 400 });
    }

    await connectMongoServer();
    const TestSession = (await import('@/backend/models/TestSession.js')).default;

    const session = await TestSession.findOne({ sessionId, status: 'active' });
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    session.proctoringLogs.push({ type, metadata, at: new Date() });
    await session.save();

    return NextResponse.json({ success: true, data: { logged: type } });
  } catch (e) {
    console.error('skills/sessions/proctoring error:', e);
    return NextResponse.json({ success: false, error: 'Could not log proctoring event' }, { status: 500 });
  }
}
