import User from '../backend/models/User.js';
import { createAuthToken } from './jwtServer.ts';
import { normalizeContact } from '../backend/utils/helpers.js';
import {
  validateContact,
  validateName,
  clampString,
  clampStringArray,
} from '../backend/middleware/security.js';
import { consumeVerifiedContact } from './otpStore.js';

function toClientUser(user) {
  if (!user) return null;
  return {
    id: user._id.toString(),
    name: user.name,
    contact: user.contact,
    isLoggedIn: true,
    skills: user.skills || [],
    hobbies: user.hobbies || [],
    college: user.college || '',
    graduationYear: user.graduationYear || '',
    city: user.city || '',
    state: user.state || '',
    plan: user.plan || 'free',
  };
}

function defaultNameFromContact(contact) {
  const normalized = normalizeContact(contact);
  if (normalized.includes('@')) return normalized.split('@')[0] || 'User';
  return normalized.slice(-4) || 'User';
}

function isProfileIncomplete(user) {
  if (!user) return false;
  const hasCollege = Boolean(String(user.college || '').trim());
  const hasSkills = Array.isArray(user.skills) && user.skills.length > 0;
  return !hasCollege || !hasSkills;
}

export async function findUserByContact(contact) {
  if (!contact) return null;
  const normalized = normalizeContact(contact);

  const direct = await User.findOne({ contact: normalized }).lean();
  if (direct) return direct;

  if (normalized.includes('@')) return null;

  const raw = String(contact || '').trim().toLowerCase();
  const digits = raw.replace(/\D/g, '');
  const variants = new Set(
    [raw, digits, digits.slice(-10), digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : '']
      .filter(Boolean)
  );

  for (const key of variants) {
    const match = await User.findOne({ contact: key }).lean();
    if (match) return match;
  }

  return null;
}

/** Sign in — existing account only (after OTP verified). */
export async function loginExistingUserAfterOtp(contact) {
  const normalized = normalizeContact(contact);
  const user = await User.findOne({ contact: normalized });
  if (!user) {
    return { ok: false, status: 404, error: 'Account not found — sign up first' };
  }

  const tokenResult = createAuthToken(user._id.toString(), normalized);
  if ('error' in tokenResult) {
    return { ok: false, status: 503, error: tokenResult.error };
  }

  user.lastActive = new Date();
  await user.save();

  return {
    ok: true,
    data: {
      user: toClientUser(user),
      token: tokenResult.token,
    },
  };
}

/**
 * Create or update a user after OTP verification and return a JWT.
 */
export async function upsertVerifiedUser(body, { requireVerified = true } = {}) {
  const {
    name,
    contact,
    skills = [],
    hobbies = [],
    college,
    graduationYear,
    city,
    state,
  } = body || {};

  const contactErr = validateContact(contact);
  if (contactErr) {
    return { ok: false, status: 400, error: contactErr };
  }

  const normalized = normalizeContact(contact);

  if (requireVerified) {
    const existing = await User.findOne({ contact: normalized }).lean();
    if (!existing) {
      const verified = await consumeVerifiedContact(normalized);
      if (!verified) {
        return { ok: false, status: 401, error: 'Verify OTP before continuing' };
      }
    }
  }

  const resolvedName = name ? clampString(name, 120) : defaultNameFromContact(normalized);
  const nameErr = validateName(resolvedName);
  if (nameErr) {
    return { ok: false, status: 400, error: nameErr };
  }

  let resolvedCity = city || '';
  let resolvedState = state || '';
  if (!resolvedCity && college) {
    resolvedCity = resolvedCity || 'Hyderabad';
    resolvedState = resolvedState || 'Telangana';
  }

  const user = await User.findOneAndUpdate(
    { contact: normalized },
    {
      name: resolvedName,
      contact: normalized,
      isLoggedIn: true,
      skills: clampStringArray(skills),
      hobbies: clampStringArray(hobbies),
      ...(college ? { college: clampString(college, 200) } : {}),
      ...(graduationYear ? { graduationYear: clampString(graduationYear, 8) } : {}),
      ...(resolvedCity ? { city: resolvedCity } : {}),
      ...(resolvedState ? { state: resolvedState } : {}),
      lastActive: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const tokenResult = createAuthToken(user._id.toString(), normalized);
  if ('error' in tokenResult) {
    return { ok: false, status: 503, error: tokenResult.error };
  }

  return {
    ok: true,
    data: {
      user: toClientUser(user),
      token: tokenResult.token,
    },
  };
}
