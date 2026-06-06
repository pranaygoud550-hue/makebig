import { NextResponse } from 'next/server';
import { listNotificationsForAuth } from '@/lib/notificationService';
import { verifyAuthFromRequest } from '@/lib/verifyAuthToken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await verifyAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Sign in again to continue' }, { status: 401 });
  }

  const result = await listNotificationsForAuth(auth);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, data: { notifications: result.notifications } });
}
