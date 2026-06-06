/**
 * OTP send/verify — Vercel-only (app/api/auth/*). Uses MongoDB.
 * OTP is shown on screen (devCode) — no email or SMS delivery.
 */
import { connectMongoServer, isMongoConfigured } from './mongoServer';
import { saveOtpRecord, verifyOtpRecord } from './otpStore.js';
import {
  findUserByContact,
  loginExistingUserAfterOtp,
  upsertVerifiedUser,
} from './userUpsert.js';
import { validateContact, validateOtpCode } from './userErrors';

export type OtpPurpose = 'signin' | 'signup';

function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizePurpose(raw: unknown): OtpPurpose {
  return raw === 'signup' ? 'signup' : 'signin';
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

export async function handleSendOtp(rawContact: string, rawPurpose?: unknown) {
  const contact = String(rawContact || '').trim();
  const purpose = normalizePurpose(rawPurpose);
  const contactErr = validateContact(contact);
  if (contactErr) {
    return { ok: false as const, status: 400, error: contactErr };
  }

  const db = await ensureOtpDatabase();
  if (!db.ok) {
    return { ok: false as const, status: db.status, error: db.error };
  }

  const normalized = contact.trim().toLowerCase();
  const existing = await findUserByContact(normalized);

  if (purpose === 'signin' && !existing) {
    return {
      ok: false as const,
      status: 404,
      error: 'Account not found — sign up first',
    };
  }

  if (purpose === 'signup' && existing) {
    return {
      ok: false as const,
      status: 409,
      error: 'Account already exists — sign in instead',
    };
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

export async function handleVerifyOtp(
  rawContact: string,
  rawCode: string,
  rawPurpose?: unknown
) {
  const contact = String(rawContact || '').trim();
  const code = String(rawCode || '').trim();
  const purpose = normalizePurpose(rawPurpose);

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

  const normalized = contact.trim().toLowerCase();

  if (purpose === 'signin') {
    const login = await loginExistingUserAfterOtp(normalized);
    if (!login.ok || !login.data) {
      return {
        ok: false as const,
        status: login.status || 404,
        error: login.error || 'Account not found — sign up first',
      };
    }
    return {
      ok: true as const,
      data: {
        verified: true,
        token: login.data.token,
        user: login.data.user,
      },
    };
  }

  const existing = await findUserByContact(normalized);
  if (existing) {
    return {
      ok: false as const,
      status: 409,
      error: 'Account already exists — sign in instead',
    };
  }

  return {
    ok: true as const,
    data: {
      verified: true,
    },
  };
}

/** Sign-up profile save after OTP verified (AuthModal onSignUp → apiUpsertUser). */
export { upsertVerifiedUser };
