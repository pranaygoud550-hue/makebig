import { NextResponse } from 'next/server';
import { readSessionFromCookie } from '@/lib/authSessionServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/auth/session — read httpOnly cookie, return current user (no token in body). */
export async function GET() {
  const session = await readSessionFromCookie();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
  }
  return NextResponse.json({ success: true, data: { user: session.user } });
}
