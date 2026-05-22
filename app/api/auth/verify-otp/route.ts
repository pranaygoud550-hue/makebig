import { NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/otp';
import { markContactVerified } from '@/lib/otpVerified.js';
import { validateContact, validateOtpCode } from '@/lib/userErrors';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const contact = String(body.contact || '').trim();
    const code = String(body.code || '').trim();

    const contactErr = validateContact(contact);
    if (contactErr) {
      return NextResponse.json({ success: false, error: contactErr }, { status: 400 });
    }
    const codeErr = validateOtpCode(code);
    if (codeErr) {
      return NextResponse.json({ success: false, error: codeErr }, { status: 400 });
    }

    const result = verifyOtp(contact, code);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error || 'Incorrect OTP code' },
        { status: 400 }
      );
    }

    markContactVerified(contact);

    return NextResponse.json({ success: true, data: { verified: true } });
  } catch (e) {
    console.error('verify-otp error:', e);
    return NextResponse.json(
      { success: false, error: 'OTP verification failed — check the code and try again' },
      { status: 500 }
    );
  }
}
