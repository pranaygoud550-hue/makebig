import User from '../backend/models/User.js';
import { generateToken } from '../backend/middleware/auth.js';
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

  const token = generateToken(user._id.toString(), normalized);

  return {
    ok: true,
    data: {
      user: toClientUser(user),
      token,
    },
  };
}
