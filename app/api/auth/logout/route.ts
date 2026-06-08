import { NextResponse } from 'next/server';
import { clearAuthCookieOnResponse } from '@/lib/authSessionServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ success: true, data: { loggedOut: true } });
  return clearAuthCookieOnResponse(response);
}
