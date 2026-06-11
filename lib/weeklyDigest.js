/**
 * Platform-wide weekly email digest for active users (Resend).
 */
import User from '../backend/models/User.js';
import Project from '../backend/models/Project.js';
import { isEmailOtpConfigured } from './emailOtp.js';
import { getResendFromAddress } from './resendConfig.js';
import { demoProjectExcludeFilter } from '../backend/utils/demoData.js';

function weekAgo() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

export async function gatherDigestForUser(user) {
  const skills = (user.skills || []).map((s) => String(s).toLowerCase());
  const since = weekAgo();

  const projects = await Project.find({
    status: { $in: ['published', 'in-progress'] },
    visibility: { $in: ['public', 'invite-only'] },
    updatedAt: { $gte: since },
    ...demoProjectExcludeFilter(),
  })
    .sort({ updatedAt: -1 })
    .limit(30)
    .lean();

  const matched = projects.filter((p) => {
    if (!skills.length) return true;
    const roles = (p.roles || []).map((r) => String(r).toLowerCase());
    const tags = (p.tags || []).map((t) => String(t).toLowerCase());
    return skills.some(
      (s) => roles.some((r) => r.includes(s) || s.includes(r)) || tags.includes(s)
    );
  });

  const hiring = matched
    .filter((p) => (p.roles || []).length > 0)
    .slice(0, 3)
    .map((p) => ({
      name: p.name,
      roles: (p.roles || []).slice(0, 2).join(', '),
      city: p.city || '',
    }));

  const newProjects = matched.slice(0, 3).map((p) => p.name);

  return { hiring, newProjects, skillCount: skills.length };
}

export function buildDigestHtml(user, digest) {
  const name = user.name || 'there';
  const lines = [
    `<p>Hi ${name},</p>`,
    `<p>Here's your week on <strong>Make Big</strong>:</p>`,
  ];

  if (digest.newProjects.length) {
    lines.push('<p><strong>New in your domain</strong></p><ul>');
    for (const n of digest.newProjects) {
      lines.push(`<li>${n}</li>`);
    }
    lines.push('</ul>');
  }

  if (digest.hiring.length) {
    lines.push('<p><strong>Teams looking for your skills</strong></p><ul>');
    for (const h of digest.hiring) {
      lines.push(
        `<li><strong>${h.name}</strong>${h.city ? ` (${h.city})` : ''} — ${h.roles || 'Open roles'}</li>`
      );
    }
    lines.push('</ul>');
  }

  if (!digest.newProjects.length && !digest.hiring.length) {
    lines.push('<p>New projects and teammates are joining every week — open Make Big to explore.</p>');
  }

  lines.push(
    '<p><a href="https://makebig.in">Open Make Big →</a></p>',
    '<p style="color:#666;font-size:12px">You can turn off digests in your profile notification settings.</p>'
  );

  return lines.join('\n');
}

export function isMonday9amIST() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  return weekday === 'Mon' && hour === 9;
}

export async function runWeeklyDigests() {
  if (!isEmailOtpConfigured()) {
    console.log('[digest] Resend not configured — skip');
    return { sent: 0 };
  }

  const users = await User.find({
    contact: { $regex: /@/ },
    'notificationPreferences.weeklyReport': { $ne: false },
  })
    .limit(500)
    .lean();

  let sent = 0;
  for (const user of users) {
    try {
      const digest = await gatherDigestForUser(user);
      const html = buildDigestHtml(user, digest);
      const apiKey = (process.env.RESEND_API_KEY || '').trim();
      const { Resend } = await import('resend');
      const resend = new Resend(apiKey);
      const { error } = await resend.emails.send({
        from: getResendFromAddress(),
        to: [user.contact],
        subject: 'This week on Make Big — projects & teams for you',
        html: `<div style="font-family:sans-serif;max-width:520px;margin:auto;line-height:1.6">${html}</div>`,
      });
      if (error) throw new Error(error.message);
      sent += 1;
    } catch (e) {
      console.warn('[digest] failed for', user.contact, e?.message);
    }
  }

  console.log(`[digest] sent ${sent} weekly digests`);
  return { sent };
}
