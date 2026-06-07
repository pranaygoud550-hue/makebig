/**
 * Weekly AI report generation and email delivery.
 */
import Groq from 'groq-sdk';
import { isGroqConfigured, GROQ_MODEL } from '../backend/ai/cofounder.js';

const DEMO_REPORT =
  'Great week! Your team completed 3 tasks and sent 12 messages. Focus next week on finishing open tasks and checking in with quieter members.';

export async function gatherProjectWeeklyData(Project, Message, Activity, StandupLog, project) {
  const projectId = project._id;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [messagesCount, activities, standups, tasksCompleted, newMembers] = await Promise.all([
    Message.countDocuments({ projectId, createdAt: { $gte: weekAgo } }),
    Activity.find({ projectId, createdAt: { $gte: weekAgo } }).lean(),
    StandupLog.find({ projectId, createdAt: { $gte: weekAgo } }).lean(),
    Promise.resolve(
      (project.tasks || []).filter(
        (t) => t.status === 'done' && t.updatedAt && new Date(t.updatedAt) >= weekAgo
      ).length
    ),
    Promise.resolve(
      (project.teamMembers || []).filter(
        (m) => m.status === 'joined' && m.joinedAt && new Date(m.joinedAt) >= weekAgo
      ).length
    ),
  ]);

  const standupSummaries = standups
    .flatMap((s) => (s.responses || []).map((r) => r.today || r.yesterday).filter(Boolean))
    .slice(0, 5);

  const healthScore = project.health?.score ?? 0;

  return {
    projectName: project.name,
    tasksCompleted,
    messagesCount,
    newMembers,
    standupSummaries,
    healthScore,
    activityCount: activities.length,
  };
}

export async function generateWeeklyReportAI(data) {
  const prompt = `Write a friendly weekly report for a student startup team. Data: ${JSON.stringify(data)}. Max 200 words. Include what went well, what needs attention, and one specific suggestion for next week. Use plain text, no markdown headers.`;

  if (!isGroqConfigured()) {
    return DEMO_REPORT;
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 400,
    });
    return completion.choices[0]?.message?.content?.trim() || DEMO_REPORT;
  } catch {
    return DEMO_REPORT;
  }
}

export async function sendWeeklyReportEmail(to, projectName, reportBody, weekLabel, projectUrl) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey || apiKey.startsWith('your_')) {
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }
  const recipient = String(to || '').trim().toLowerCase();
  if (!recipient.includes('@')) {
    return { ok: false, error: 'Owner has no email' };
  }

  try {
    const { getResendFromAddress } = await import('./resendConfig.js');
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const link = projectUrl || 'https://makebig.vercel.app';

    const { error } = await resend.emails.send({
      from: getResendFromAddress(),
      to: [recipient],
      subject: `📊 ${projectName} — Week of ${weekLabel}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;line-height:1.6">
          <h2 style="color:#0A66C2">Weekly team report</h2>
          <p style="white-space:pre-wrap;color:#333">${reportBody.replace(/</g, '&lt;')}</p>
          <p><a href="${link}" style="color:#0A66C2;font-weight:bold">Open your project →</a></p>
        </div>
      `,
    });
    if (error) return { ok: false, error: error.message || 'Email failed' };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Email failed' };
  }
}

export function getISTWeekKey() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const d = new Date(fmt.format(new Date()));
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return start.toISOString().slice(0, 10);
}

export function isSunday8pmIST() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  return weekday === 'Sun' && hour === 20;
}

export function weekLabelIST() {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());
}
