import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME } from '@/lib/authCookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Short-lived token for Socket.io (cookie is not sent cross-origin to Render). */
export async function GET() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
  }
  return NextResponse.json({ success: true, data: { token } });
}
