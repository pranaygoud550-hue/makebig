/**
 * Shared OTP helpers for Next.js API routes and optional Express server.
 */

import { saveOtpRecord, verifyOtpRecord } from './otpStore.js';
import { sendOtpEmail, isEmailOtpConfigured } from './emailOtp.js';

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function normalizeOtpContact(contact: string): string {
  return contact.trim().toLowerCase();
}

export function isPhoneContact(contact: string): boolean {
  return /^[\d\s+\-()]{7,15}$/.test(contact.replace(/\s/g, ''));
}

export async function saveOtp(contact: string, code: string, ttlMs = 10 * 60 * 1000) {
  return saveOtpRecord(contact, code, ttlMs);
}

export async function verifyOtp(
  contact: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  return verifyOtpRecord(contact, code);
}

export async function deliverOtp(contact: string, code: string): Promise<boolean> {
  const isPhone = isPhoneContact(contact);

  if (isPhone) {
    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey || apiKey.startsWith('your_')) return false;
    try {
      const cleanPhone = contact.replace(/[^\d]/g, '').slice(-10);
      const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&route=otp&variables_values=${code}&flash=0&numbers=${cleanPhone}`;
      const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
      const data = await res.json();
      return data.return === true;
    } catch {
      return false;
    }
  }

  if (!isEmailOtpConfigured()) return false;

  const result = await sendOtpEmail(contact, code);
  return result.ok;
}
