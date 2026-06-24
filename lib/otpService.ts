/**
 * OTP send/verify — Vercel API routes. Uses MongoDB + Resend email when configured.
 */
import { connectMongoServer, isMongoConfigured } from './mongoServer';
import { saveOtpRecord, verifyOtpRecord } from './otpStore.js';
import { sendOtpEmail, isEmailOtpConfigured } from './emailOtp.js';
import {
  findUserByContact,
  loginExistingUserAfterOtp,
  upsertVerifiedUser,
} from './userUpsert.js';
import { validateContact, validateOtpCode } from './userErrors';

export type OtpPurpose = 'signin' | 'signup';

function isEmailContact(contact: string) {
  return contact.includes('@');
}

function isProfileIncomplete(user: {
  college?: string;
  skills?: unknown[];
} | null) {
  if (!user) return false;
  const hasCollege = Boolean(String(user.college || '').trim());
  const hasSkills = Array.isArray(user.skills) && user.skills.length > 0;
  return !hasCollege || !hasSkills;
}

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

  if (purpose === 'signup' && existing && !isProfileIncomplete(existing)) {
    return {
      ok: false as const,
      status: 409,
      error: 'Account already exists — sign in instead',
    };
  }

  const code = generateOtpCode();
  await saveOtpRecord(contact, code);

  let emailSent = false;
  let emailNote: string | undefined;

  if (isEmailContact(normalized) && isEmailOtpConfigured()) {
    const emailResult = await sendOtpEmail(normalized, code);
    if (emailResult.ok) {
      emailSent = true;
    } else {
      emailNote = emailResult.error;
      console.error('[otp] Email delivery failed:', emailResult.error);
    }
  }

  let message = 'Enter the verification code shown below.';
  if (emailSent) {
    message = 'We also emailed your code — use the code shown below to sign in.';
  } else if (emailNote && isEmailContact(normalized)) {
    message = 'Email could not be delivered — use the verification code shown below.';
  }

  return {
    ok: true as const,
    data: {
      sent: emailSent,
      devCode: code,
      message,
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

  const verifyResult = await verifyOtpRecord(contact, code);
  if (!verifyResult.ok) {
    return { ok: false as const, status: 400, error: verifyResult.error || 'Invalid or expired code' };
  }

  const normalized = contact.trim().toLowerCase();

  if (purpose === 'signin') {
    const login = await loginExistingUserAfterOtp(normalized);
    if (!login.ok) {
      return { ok: false as const, status: login.status || 401, error: login.error || 'Sign in failed' };
    }
    return { ok: true as const, data: login.data };
  }

  return {
    ok: true as const,
    data: { verified: true, contact: normalized },
  };
}

export async function handleUpsertAfterOtp(body: Record<string, unknown>) {
  const db = await ensureOtpDatabase();
  if (!db.ok) {
    return { ok: false as const, status: db.status, error: db.error };
  }

  const result = await upsertVerifiedUser(body, { requireVerified: true });
  if (!result.ok) {
    return { ok: false as const, status: result.status || 400, error: result.error || 'Could not save account' };
  }
  return { ok: true as const, data: result.data };
}
