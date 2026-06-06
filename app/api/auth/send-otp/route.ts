import { NextResponse } from 'next/server';
import { deliverOtp, generateOtpCode, isPhoneContact, saveOtp } from '@/lib/otp';
import { validateContact } from '@/lib/userErrors';

export const runtime = 'nodejs';

function allowDevOtp() {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_OTP === 'true';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const contact = String(body.contact || '').trim();
    const contactErr = validateContact(contact);
    if (contactErr) {
      return NextResponse.json({ success: false, error: contactErr }, { status: 400 });
    }

    const code = generateOtpCode();
    await saveOtp(contact, code);

    const sent = await deliverOtp(contact, code);

    if (!sent && process.env.NODE_ENV === 'production' && !allowDevOtp()) {
      return NextResponse.json(
        {
          success: false,
          error: 'OTP delivery is not configured — set RESEND_API_KEY and EMAIL_FROM on Vercel',
        },
        { status: 503 }
      );
    }

    const devMode = !sent && allowDevOtp();
    if (devMode) {
      console.log(`[OTP dev] ${contact}: ${code}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        sent,
        devCode: devMode ? code : undefined,
        message: sent
          ? `OTP sent to your ${isPhoneContact(contact) ? 'phone' : 'email'}`
          : devMode
            ? 'OTP ready — use the code shown below (dev mode)'
            : 'OTP sent',
      },
    });
  } catch (e) {
    console.error('send-otp error:', e);
    return NextResponse.json(
      { success: false, error: 'Could not send OTP — check your email/phone and try again' },
      { status: 500 }
    );
  }
}
