import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSendOtp, handleVerifyOtp } from '@/lib/otpService';

vi.mock('@/lib/emailOtp.js', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue({ ok: false }),
  isEmailOtpConfigured: vi.fn(() => false),
}));

vi.mock('@/lib/mongoServer', () => ({
  isMongoConfigured: vi.fn(() => true),
  connectMongoServer: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/otpStore.js', () => ({
  saveOtpRecord: vi.fn().mockResolvedValue(undefined),
  verifyOtpRecord: vi.fn().mockResolvedValue({ ok: true }),
}));

const findUserByContact = vi.fn();
const loginExistingUserAfterOtp = vi.fn();

vi.mock('@/lib/userUpsert.js', () => ({
  findUserByContact: (...args: unknown[]) => findUserByContact(...args),
  loginExistingUserAfterOtp: (...args: unknown[]) => loginExistingUserAfterOtp(...args),
  upsertVerifiedUser: vi.fn(),
}));

describe('otpService purpose', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sign-in send rejects unknown accounts', async () => {
    findUserByContact.mockResolvedValue(null);
    const result = await handleSendOtp('new@example.com', 'signin');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
      expect(result.error).toMatch(/sign up first/i);
    }
  });

  it('sign-up send allows incomplete existing accounts', async () => {
    findUserByContact.mockResolvedValue({
      contact: 'half@example.com',
      college: '',
      skills: [],
    });
    const result = await handleSendOtp('half@example.com', 'signup');
    expect(result.ok).toBe(true);
  });

  it('sign-up send rejects complete existing accounts', async () => {
    findUserByContact.mockResolvedValue({
      contact: 'old@example.com',
      college: 'Test College',
      skills: ['Dev'],
    });
    const result = await handleSendOtp('old@example.com', 'signup');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
    }
  });

  it('sign-in verify requires existing user', async () => {
    loginExistingUserAfterOtp.mockResolvedValue({
      ok: false,
      status: 404,
      error: 'Account not found — sign up first',
    });
    const result = await handleVerifyOtp('new@example.com', '123456', 'signin');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/sign up first/i);
    }
  });

  it('sign-up verify does not create account', async () => {
    findUserByContact.mockResolvedValue(null);
    const result = await handleVerifyOtp('new@example.com', '123456', 'signup');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.verified).toBe(true);
      expect(result.data.token).toBeUndefined();
    }
  });
});
