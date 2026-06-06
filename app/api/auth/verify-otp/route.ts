import { NextResponse } from 'next/server';
import { handleVerifyOtp } from '@/lib/otpService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await handleVerifyOtp(body.contact, body.code, body.purpose);

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (e) {
    console.error('verify-otp error:', e);
    const message = e instanceof Error ? e.message : 'OTP verification failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
