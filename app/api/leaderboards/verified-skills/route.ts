import { NextResponse } from 'next/server';
import { connectMongoServer } from '@/lib/mongoServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LEADERBOARD_CATEGORIES = {
  developers: ['frontend_developer', 'backend_developer'],
  designers: ['ui_ux_designer'],
  ai_engineers: ['ai_ml_engineer'],
  marketers: ['marketing_specialist', 'content_writer', 'video_editor'],
} as const;

type CategoryKey = keyof typeof LEADERBOARD_CATEGORIES;

async function topForSkills(skillIds: string[], limit = 10) {
  const User = (await import('@/backend/models/User.js')).default;
  const users = await User.find({ 'verifiedSkills.skillId': { $in: skillIds } })
    .select('name contact college verifiedSkills')
    .lean();

  const rows: Array<{
    name: string;
    contact: string;
    college: string;
    skillName: string;
    score: number;
    badge: string;
    badgeIcon: string;
  }> = [];

  for (const u of users) {
    for (const vs of u.verifiedSkills || []) {
      if (!skillIds.includes(vs.skillId) || (vs.score ?? 0) < 50) continue;
      rows.push({
        name: u.name,
        contact: u.contact,
        college: u.college || '',
        skillName: vs.skillName,
        score: vs.score,
        badge: vs.badgeLabel || vs.badge,
        badgeIcon: vs.badgeIcon || '🏅',
      });
    }
  }

  rows.sort((a, b) => b.score - a.score);
  return rows.slice(0, limit);
}

export async function GET() {
  try {
    await connectMongoServer();

    const data: Record<CategoryKey, Awaited<ReturnType<typeof topForSkills>>> = {
      developers: await topForSkills([...LEADERBOARD_CATEGORIES.developers]),
      designers: await topForSkills([...LEADERBOARD_CATEGORIES.designers]),
      ai_engineers: await topForSkills([...LEADERBOARD_CATEGORIES.ai_engineers]),
      marketers: await topForSkills([...LEADERBOARD_CATEGORIES.marketers]),
    };

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error('leaderboard error:', e);
    return NextResponse.json({ success: false, error: 'Could not load leaderboard' }, { status: 500 });
  }
}
