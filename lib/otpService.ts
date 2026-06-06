/**
 * OTP send/verify — Vercel-only (app/api/auth/*). Uses MongoDB.
 * OTP is shown on screen (devCode) — no email or SMS delivery.
 */
import { connectMongoServer, isMongoConfigured } from './mongoServer';
import { saveOtpRecord, verifyOtpRecord } from './otpStore.js';
import { upsertVerifiedUser } from './userUpsert.js';
import { validateContact, validateOtpCode } from './userErrors';

function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

  return {
    ok: true as const,
    data: {
      sent: false,
      devCode: code,
      message: 'Enter the verification code shown below',
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
