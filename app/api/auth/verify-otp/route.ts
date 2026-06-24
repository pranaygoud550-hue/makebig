import { NextResponse } from 'next/server';
import { handleVerifyOtp } from '@/lib/otpService';
import { setAuthCookieOnResponse } from '@/lib/authSessionServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await handleVerifyOtp(body.contact, body.code, body.purpose);

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    const payload = { ...result.data };
    const token =
      payload && typeof payload === 'object' && 'token' in payload
        ? String((payload as { token?: string }).token || '')
        : '';
    if ('token' in payload) {
      delete (payload as { token?: string }).token;
    }

    const response = NextResponse.json({ success: true, data: payload });

    if (token) {
      return setAuthCookieOnResponse(response, token);
    }

    return response;
  } catch (e) {
    console.error('verify-otp error:', e);
    const message = e instanceof Error ? e.message : 'OTP verification failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
