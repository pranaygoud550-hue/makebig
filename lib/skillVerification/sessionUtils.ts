import { randomBytes } from 'crypto';

export function generateSessionId(): string {
  return `ts_${randomBytes(16).toString('hex')}`;
}

export const SESSION_DURATION_MS = 90 * 60 * 1000;
