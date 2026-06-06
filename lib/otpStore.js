/**
 * Shared OTP + verification store (MongoDB in production, in-memory fallback for local dev).
 */
import mongoose from 'mongoose';
import { connectMongoServer, isMongoConfigured } from './mongoServer.ts';

const memOtp = new Map();
const memVerified = new Map();

const otpRecordSchema = new mongoose.Schema(
  {
    contact: { type: String, required: true, unique: true, lowercase: true, trim: true },
    code: { type: String, default: null },
    codeExpiresAt: { type: Date, default: null },
    verifiedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

function getOtpModel() {
  return mongoose.models.OtpRecord || mongoose.model('OtpRecord', otpRecordSchema);
}

function normalize(contact) {
  return String(contact || '').trim().toLowerCase();
}

async function ensureMongo() {
  if (!isMongoConfigured()) return false;
  try {
    await connectMongoServer();
    return mongoose.connection.readyState === 1;
  } catch (error) {
    console.error('[otpStore] MongoDB connect failed:', error);
    return false;
  }
}

export async function saveOtpRecord(contact, code, ttlMs = 10 * 60 * 1000) {
  const key = normalize(contact);
  const codeExpiresAt = new Date(Date.now() + ttlMs);

  if (await ensureMongo()) {
    await getOtpModel().findOneAndUpdate(
      { contact: key },
      { contact: key, code, codeExpiresAt, verifiedUntil: null },
      { upsert: true, new: true }
    );
    return key;
  }

  memOtp.set(key, { code, expiresAt: Date.now() + ttlMs });
  return key;
}

export async function verifyOtpRecord(contact, code) {
  const key = normalize(contact);
  const trimmedCode = String(code || '').trim();

  if (await ensureMongo()) {
    const record = await getOtpModel().findOne({ contact: key });
    if (!record?.code) {
      return { ok: false, error: 'No OTP found. Tap Send OTP again.' };
    }
    if (!record.codeExpiresAt || Date.now() > record.codeExpiresAt.getTime()) {
      await getOtpModel().deleteOne({ contact: key });
      return { ok: false, error: 'OTP expired. Tap Send OTP again.' };
    }
    if (record.code !== trimmedCode) {
      return { ok: false, error: 'Incorrect OTP code' };
    }

    await getOtpModel().findOneAndUpdate(
      { contact: key },
      {
        code: null,
        codeExpiresAt: null,
        verifiedUntil: new Date(Date.now() + 15 * 60 * 1000),
      }
    );
    return { ok: true };
  }

  const stored = memOtp.get(key);
  if (!stored) {
    return { ok: false, error: 'No OTP found. Tap Send OTP again.' };
  }
  if (Date.now() > stored.expiresAt) {
    memOtp.delete(key);
    return { ok: false, error: 'OTP expired. Tap Send OTP again.' };
  }
  if (stored.code !== trimmedCode) {
    return { ok: false, error: 'Incorrect OTP code' };
  }

  memOtp.delete(key);
  memVerified.set(key, Date.now() + 15 * 60 * 1000);
  return { ok: true };
}

export async function markContactVerified(contact, ttlMs = 15 * 60 * 1000) {
  const key = normalize(contact);
  const verifiedUntil = new Date(Date.now() + ttlMs);

  if (await ensureMongo()) {
    await getOtpModel().findOneAndUpdate(
      { contact: key },
      { contact: key, verifiedUntil, code: null, codeExpiresAt: null },
      { upsert: true, new: true }
    );
    return;
  }

  memVerified.set(key, Date.now() + ttlMs);
}

export async function consumeVerifiedContact(contact) {
  const key = normalize(contact);

  if (await ensureMongo()) {
    const record = await getOtpModel().findOne({ contact: key });
    if (!record?.verifiedUntil || Date.now() > record.verifiedUntil.getTime()) {
      return false;
    }
    await getOtpModel().updateOne({ contact: key }, { verifiedUntil: null });
    return true;
  }

  const expiresAt = memVerified.get(key);
  if (!expiresAt || Date.now() > expiresAt) return false;
  memVerified.delete(key);
  return true;
}

export async function isContactVerified(contact) {
  const key = normalize(contact);

  if (await ensureMongo()) {
    const record = await getOtpModel().findOne({ contact: key }).lean();
    return Boolean(record?.verifiedUntil && Date.now() <= record.verifiedUntil.getTime());
  }

  const expiresAt = memVerified.get(key);
  return Boolean(expiresAt && Date.now() <= expiresAt);
}
