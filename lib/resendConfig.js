/**
 * Resend sender + sandbox rules for OTP email.
 *
 * With onboarding@resend.dev (no verified domain), Resend only delivers to
 * RESEND_ACCOUNT_EMAIL — the email on your Resend account.
 *
 * After verifying a domain at resend.com/domains, set:
 *   EMAIL_FROM=Make Big <otp@yourdomain.com>
 */
const SANDBOX_FROM = 'onboarding@resend.dev';

export function getResendFromAddress() {
  return (process.env.EMAIL_FROM || `Make Big <${SANDBOX_FROM}>`).trim();
}

export function isResendSandboxFrom(from = getResendFromAddress()) {
  return from.includes(SANDBOX_FROM);
}

export function getResendAccountEmail() {
  return (process.env.RESEND_ACCOUNT_EMAIL || 'pranaygoud550@gmail.com').trim().toLowerCase();
}

/** Returns null if send is allowed, otherwise a user-facing error string. */
export function getResendRecipientError(recipient) {
  const to = String(recipient || '').trim().toLowerCase();
  if (!to) return 'Recipient email is required';

  if (!isResendSandboxFrom()) return null;

  const allowed = getResendAccountEmail();
  if (to === allowed) return null;

  return (
    `OTP email is in beta — use ${allowed} to sign in, or verify a domain at resend.com/domains ` +
    `and set EMAIL_FROM to an address on that domain (e.g. Make Big <otp@yourdomain.com>).`
  );
}
