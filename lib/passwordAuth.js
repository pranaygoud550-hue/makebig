import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

const MIN_PASSWORD_LENGTH = 6;

export function validatePassword(password) {
  if (!password || String(password).length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

export async function hashPassword(password) {
  const err = validatePassword(password);
  if (err) throw new Error(err);
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(String(password), salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash || !password) return false;
  const parts = String(storedHash).split(':');
  if (parts.length !== 2) return false;
  const [salt, hashHex] = parts;
  try {
    const derived = await scryptAsync(String(password), salt, 64);
    const expected = Buffer.from(hashHex, 'hex');
    if (expected.length !== derived.length) return false;
    return timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}
