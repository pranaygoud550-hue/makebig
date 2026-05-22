/**
 * Shared OTP helpers for Next.js API routes and optional Express server.
 */

const globalOtp = globalThis as typeof globalThis & {
  __makeBigOtpStore?: Map<string, { code: string; expiresAt: number }>;
};

function getStore() {
  if (!globalOtp.__makeBigOtpStore) {
    globalOtp.__makeBigOtpStore = new Map();
  }
  return globalOtp.__makeBigOtpStore;
}

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function normalizeOtpContact(contact: string): string {
  return contact.trim().toLowerCase();
}

export function isPhoneContact(contact: string): boolean {
  return /^[\d\s+\-()]{7,15}$/.test(contact.replace(/\s/g, ''));
}

export function saveOtp(contact: string, code: string, ttlMs = 10 * 60 * 1000) {
  const key = normalizeOtpContact(contact);
  getStore().set(key, { code, expiresAt: Date.now() + ttlMs });
  return key;
}

export function verifyOtp(contact: string, code: string): { ok: boolean; error?: string } {
  const key = normalizeOtpContact(contact);
  const stored = getStore().get(key);
  if (!stored) {
    return { ok: false, error: 'No OTP found. Tap Send OTP again.' };
  }
  if (Date.now() > stored.expiresAt) {
    getStore().delete(key);
    return { ok: false, error: 'OTP expired. Tap Send OTP again.' };
  }
  if (stored.code !== String(code).trim()) {
    return { ok: false, error: 'Incorrect OTP code' };
  }
  getStore().delete(key);
  return { ok: true };
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

  const user = process.env.EMAIL_FROM;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass || user.startsWith('your_')) return false;

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: `"Make Big" <${user}>`,
      to: contact,
      subject: 'Your Make Big OTP',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#0A66C2">Make Big</h2>
          <p>Your verification code is:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1d2226;margin:20px 0">${code}</div>
          <p style="color:#666;font-size:13px">Expires in 10 minutes.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('Email OTP error:', err);
    return false;
  }
}
