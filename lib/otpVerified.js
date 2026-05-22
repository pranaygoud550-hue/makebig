/** Shared in-memory OTP verification flag (same process / global for Next + Express dev). */

const globalRef = globalThis;

function getVerifiedStore() {
  if (!globalRef.__makeBigVerifiedStore) {
    globalRef.__makeBigVerifiedStore = new Map();
  }
  return globalRef.__makeBigVerifiedStore;
}

function normalize(contact) {
  return String(contact || "").trim().toLowerCase();
}

export function markContactVerified(contact, ttlMs = 15 * 60 * 1000) {
  getVerifiedStore().set(normalize(contact), Date.now() + ttlMs);
}

export function consumeVerifiedContact(contact) {
  const key = normalize(contact);
  const expiresAt = getVerifiedStore().get(key);
  if (!expiresAt || Date.now() > expiresAt) return false;
  getVerifiedStore().delete(key);
  return true;
}

export function isContactVerified(contact) {
  const key = normalize(contact);
  const expiresAt = getVerifiedStore().get(key);
  return Boolean(expiresAt && Date.now() <= expiresAt);
}
