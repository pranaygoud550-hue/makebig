/**
 * Project health alert emails and helpers.
 */
export async function sendHealthAlertEmail(to, projectName, healthScore, daysSinceActivity) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey || apiKey.startsWith('your_')) {
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }
  const recipient = String(to || '').trim().toLowerCase();
  if (!recipient.includes('@')) return { ok: false, error: 'No email' };

  try {
    const { getResendFromAddress } = await import('./resendConfig.js');
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: getResendFromAddress(),
      to: [recipient],
      subject: `⚠️ ${projectName} health dropped to ${healthScore}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#dc2626">Project health alert</h2>
          <p><strong>${projectName}</strong> health score is <strong>${healthScore}</strong>.</p>
          <p>Last team activity was about ${daysSinceActivity} day(s) ago. Time to check in with your team!</p>
          <p><a href="https://makebig.vercel.app" style="color:#0A66C2">Open Make Big →</a></p>
        </div>
      `,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Email failed' };
  }
}

export function daysSince(date) {
  if (!date) return 999;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}
