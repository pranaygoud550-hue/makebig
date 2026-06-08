import { NextResponse } from 'next/server';
import { connectMongoServer } from '@/lib/mongoServer';
import { loginExistingUserAfterOtp, upsertVerifiedUser } from '@/lib/userUpsert.js';
import {
  clearAuthCookieOnResponse,
  readSessionFromCookie,
  setAuthCookieOnResponse,
} from '@/lib/authSessionServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/login
 * - Sign-in: { contact } after OTP verified (issues JWT cookie)
 * - Sign-up complete: { name, contact, skills, ... } after OTP + profile (upsert + cookie)
 * - Legacy: { token } to set cookie from an existing JWT
 */
export async function POST(req: Request) {
  try {
    await connectMongoServer();
    const body = await req.json();

    if (body.token && typeof body.token === 'string') {
      const response = NextResponse.json({ success: true, data: { loggedIn: true } });
      return setAuthCookieOnResponse(response, body.token);
    }

    const contact = String(body.contact || '').trim().toLowerCase();
    if (!contact) {
      return NextResponse.json({ success: false, error: 'Contact required' }, { status: 400 });
    }

    const isSignupPayload = Boolean(body.name || body.skills?.length || body.college);

    if (isSignupPayload) {
      const result = await upsertVerifiedUser(body, { requireVerified: true });
      if (!result.ok || !result.data) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: result.status || 400 }
        );
      }
      const response = NextResponse.json({
        success: true,
        data: { user: result.data.user },
      });
      return setAuthCookieOnResponse(response, result.data.token);
    }

    const login = await loginExistingUserAfterOtp(contact);
    if (!login.ok || !login.data) {
      return NextResponse.json(
        { success: false, error: login.error || 'Login failed' },
        { status: login.status || 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      data: { user: login.data.user },
    });
    return setAuthCookieOnResponse(response, login.data.token);
  } catch (e) {
    console.error('auth/login error:', e);
    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 });
  }
}

export async function GET() {
  const session = await readSessionFromCookie();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
  }
  return NextResponse.json({ success: true, data: { user: session.user } });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, data: { loggedOut: true } });
  return clearAuthCookieOnResponse(response);
}
