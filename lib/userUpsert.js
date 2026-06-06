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
    verifiedSkills: (user.verifiedSkills || []).map((s) => ({
      skillId: s.skillId,
      skillName: s.skillName,
      score: s.score,
      testScore: s.testScore ?? s.score,
      integrityScore: s.integrityScore ?? 100,
      mcqScore: s.mcqScore,
      practicalScore: s.practicalScore,
      badge: s.badge,
      badgeLabel: s.badgeLabel,
      badgeIcon: s.badgeIcon,
      proctorFlags: s.proctorFlags || [],
      suspicious: Boolean(s.suspicious),
      verifiedAt: s.verifiedAt ? new Date(s.verifiedAt).toISOString() : undefined,
    })),
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
    verifiedSkills = [],
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

  const normalizedSkills = clampStringArray(skills);
  const verifiedList = Array.isArray(verifiedSkills)
    ? verifiedSkills
        .filter((s) => s && s.skillId && s.skillName)
        .map((s) => ({
          skillId: clampString(s.skillId, 64),
          skillName: clampString(s.skillName, 120),
          score: Math.max(0, Math.min(100, Number(s.score) || 0)),
          testScore: Math.max(0, Math.min(100, Number(s.testScore ?? s.score) || 0)),
          integrityScore: Math.max(0, Math.min(100, Number(s.integrityScore) || 100)),
          mcqScore: Math.max(0, Math.min(100, Number(s.mcqScore) || 0)),
          practicalScore: Math.max(0, Math.min(100, Number(s.practicalScore) || 0)),
          badge: clampString(s.badge, 32) || 'not_verified',
          badgeLabel: clampString(s.badgeLabel, 64) || 'Not Verified',
          badgeIcon: clampString(s.badgeIcon, 8) || '—',
          proctorFlags: Array.isArray(s.proctorFlags) ? clampStringArray(s.proctorFlags) : [],
          suspicious: Boolean(s.suspicious),
          verifiedAt: s.verifiedAt ? new Date(s.verifiedAt) : new Date(),
        }))
    : [];

  const verifiedSkillNames = verifiedList
    .filter((s) => s.score >= 50)
    .map((s) => s.skillName.toLowerCase());
  const mergedSkills = [...new Set([...normalizedSkills, ...verifiedSkillNames])];

  const user = await User.findOneAndUpdate(
    { contact: normalized },
    {
      name: resolvedName,
      contact: normalized,
      isLoggedIn: true,
      skills: mergedSkills,
      hobbies: clampStringArray(hobbies),
      ...(verifiedList.length ? { verifiedSkills: verifiedList } : {}),
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
