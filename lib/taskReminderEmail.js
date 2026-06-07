/**
 * Send task due-date reminder email via Resend.
 */
export async function sendTaskReminderEmail(to, taskTitle, projectName, dueDate) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey || apiKey.startsWith('your_')) {
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }

  const recipient = String(to || '').trim().toLowerCase();
  if (!recipient.includes('@')) {
    return { ok: false, error: 'Assignee has no email' };
  }

  try {
    const { getResendFromAddress } = await import('./resendConfig.js');
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const dueLabel = dueDate
      ? new Date(dueDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
      : 'soon';

    const { error } = await resend.emails.send({
      from: getResendFromAddress(),
      to: [recipient],
      subject: `Reminder: "${taskTitle}" is due soon`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#0A66C2">Make Big — Task reminder</h2>
          <p>Your task <strong>${taskTitle}</strong> on project <strong>${projectName}</strong> is due by ${dueLabel}.</p>
          <p style="color:#666;font-size:13px">Open your dashboard to update progress.</p>
        </div>
      `,
    });

    if (error) return { ok: false, error: error.message || 'Email failed' };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Email failed' };
  }
}
