/**
 * Resend email delivery for OTP (Vercel API routes).
 */
export async function sendOtpEmail(to, code) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey || apiKey.startsWith('your_')) {
    return { ok: false, error: 'RESEND_API_KEY is not configured on Vercel' };
  }

  const from = (process.env.EMAIL_FROM || 'Make Big <onboarding@resend.dev>').trim();
  if (!from) {
    return { ok: false, error: 'EMAIL_FROM is not configured on Vercel' };
  }

  const recipient = String(to || '').trim().toLowerCase();
  if (!recipient) {
    return { ok: false, error: 'Recipient email is required' };
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: [recipient],
      subject: 'Your Make Big OTP',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#0A66C2">Make Big</h2>
          <p>Your verification code is:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1d2226;margin:20px 0">${code}</div>
          <p style="color:#666;font-size:13px">Expires in 10 minutes. Do not share this code.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend OTP error:', error);
      const hint =
        from.includes('onboarding@resend.dev') && !recipient.includes('@')
          ? ''
          : from.includes('onboarding@resend.dev')
            ? ' (onboarding@resend.dev only delivers to your Resend account email until you verify a domain)'
            : '';
      return { ok: false, error: `${error.message || 'Email delivery failed'}${hint}` };
    }

    if (!data?.id) {
      return { ok: false, error: 'Resend did not return a message id' };
    }

    console.log(`[otp] Resend message id: ${data.id} → ${recipient}`);
    return { ok: true, messageId: data.id };
  } catch (err) {
    console.error('Resend OTP error:', err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Email delivery failed',
    };
  }
}

export function isEmailOtpConfigured() {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  return Boolean(apiKey && !apiKey.startsWith('your_'));
}
