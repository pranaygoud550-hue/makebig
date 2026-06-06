/**
 * OTP send/verify — Vercel-only (app/api/auth/*). Uses MongoDB + Resend.
 */
import { connectMongoServer, isMongoConfigured } from './mongoServer';
import { saveOtpRecord, verifyOtpRecord } from './otpStore.js';
import { sendOtpEmail, isEmailOtpConfigured } from './emailOtp.js';
import { upsertVerifiedUser } from './userUpsert.js';
import { validateContact, validateOtpCode } from './userErrors';

function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isPhoneContact(contact: string): boolean {
  return /^[\d\s+\-()]{7,15}$/.test(contact.replace(/\s/g, ''));
}

function allowDevOtp(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_OTP === 'true';
}

async function ensureOtpDatabase(): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!isMongoConfigured()) {
    return {
      ok: false,
      status: 503,
      error: 'MONGODB_URI is not set on Vercel — required for OTP storage',
    };
  }

  try {
    await connectMongoServer();
    return { ok: true };
  } catch (e) {
    console.error('[otp] MongoDB connection failed:', e);
    return {
      ok: false,
      status: 503,
      error: 'Database unavailable — check MONGODB_URI on Vercel',
    };
  }
}

async function deliverPhoneOtp(phone: string, code: string): Promise<{ sent: boolean; error?: string }> {
  const apiKey = (process.env.FAST2SMS_API_KEY || '').trim();
  if (!apiKey || apiKey.startsWith('your_')) {
    return { sent: false, error: 'FAST2SMS_API_KEY is not configured for SMS OTP' };
  }

  try {
    const cleanPhone = phone.replace(/[^\d]/g, '').slice(-10);
    const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&route=otp&variables_values=${code}&flash=0&numbers=${cleanPhone}`;
    const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
    const data = await res.json();
    if (data.return === true) return { sent: true };
    return { sent: false, error: 'SMS provider rejected the request' };
  } catch (e) {
    return {
      sent: false,
      error: e instanceof Error ? e.message : 'SMS delivery failed',
    };
  }
}

export async function handleSendOtp(rawContact: string) {
  const contact = String(rawContact || '').trim();
  const contactErr = validateContact(contact);
  if (contactErr) {
    return { ok: false as const, status: 400, error: contactErr };
  }

  const db = await ensureOtpDatabase();
  if (!db.ok) {
    return { ok: false as const, status: db.status, error: db.error };
  }

  const code = generateOtpCode();
  await saveOtpRecord(contact, code);

  const isPhone = isPhoneContact(contact);
  let sent = false;
  let deliveryError: string | undefined;

  if (isPhone) {
    const sms = await deliverPhoneOtp(contact, code);
    sent = sms.sent;
    deliveryError = sms.error;
  } else {
    if (!isEmailOtpConfigured()) {
      deliveryError = 'RESEND_API_KEY is not configured on Vercel';
    } else {
      const email = await sendOtpEmail(contact, code);
      sent = email.ok;
      deliveryError = email.error;
      if (email.ok) {
        console.log(`[otp] Resend accepted OTP email for ${contact}`);
      }
    }
  }

  if (!sent && process.env.NODE_ENV === 'production' && !allowDevOtp()) {
    const status = deliveryError?.includes('OTP email is in beta') ? 400 : 503;
    return {
      ok: false as const,
      status,
      error:
        deliveryError ||
        (isPhone
          ? 'SMS OTP is not configured — set FAST2SMS_API_KEY on Vercel'
          : 'Email OTP failed — check RESEND_API_KEY and EMAIL_FROM on Vercel'),
    };
  }

  const devMode = !sent && allowDevOtp();
  if (devMode) {
    console.log(`[OTP dev] ${contact}: ${code}`);
  }

  return {
    ok: true as const,
    data: {
      sent,
      devCode: devMode ? code : undefined,
      message: sent
        ? `OTP sent to your ${isPhone ? 'phone' : 'email'}`
        : devMode
          ? 'OTP ready — use the code shown below (dev mode)'
          : 'OTP sent',
    },
  };
}

export async function handleVerifyOtp(rawContact: string, rawCode: string) {
  const contact = String(rawContact || '').trim();
  const code = String(rawCode || '').trim();

  const contactErr = validateContact(contact);
  if (contactErr) {
    return { ok: false as const, status: 400, error: contactErr };
  }
  const codeErr = validateOtpCode(code);
  if (codeErr) {
    return { ok: false as const, status: 400, error: codeErr };
  }

  const db = await ensureOtpDatabase();
  if (!db.ok) {
    return { ok: false as const, status: db.status, error: db.error };
  }

  const result = await verifyOtpRecord(contact, code);
  if (!result.ok) {
    return { ok: false as const, status: 400, error: result.error || 'Incorrect OTP code' };
  }

  const upsert = await upsertVerifiedUser(
    { contact: contact.trim().toLowerCase() },
    { requireVerified: true }
  );

  if (!upsert.ok || !upsert.data) {
    return {
      ok: false as const,
      status: upsert.status || 500,
      error: upsert.error || 'Could not complete sign in',
    };
  }

  return {
    ok: true as const,
    data: {
      verified: true,
      token: upsert.data.token,
      user: upsert.data.user,
    },
  };
}
