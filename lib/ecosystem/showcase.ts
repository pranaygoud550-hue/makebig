import { SHOWCASE_BADGES } from './constants';

export interface ShowcaseCandidate {
  projectId: string;
  name: string;
  slug: string;
  categoryId: string;
  ownerContact: string;
  ownerName?: string;
  logoUrl?: string;
  readinessScore: number;
  healthScore: number;
  engagementScore: number;
  profileCompleteness: number;
  compositeScore: number;
  badge: (typeof SHOWCASE_BADGES)[number];
}

export function weekStartDate(d = new Date()): string {
  const date = new Date(d);
  const day = date.getUTCDay();
  const diff = day === 0 ? 0 : day;
  date.setUTCDate(date.getUTCDate() - diff);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

export function rankShowcaseProjects(
  projects: Array<{
    id: string;
    name: string;
    slug: string;
    categoryId: string;
    ownerContact: string;
    ownerName?: string;
    logoUrl?: string;
    startupReadiness?: { overall?: number };
    health?: { score?: number };
    followerCount?: number;
    postsThisWeek?: number;
    teamSize?: number;
    desc?: string;
    gallery?: string[];
  }>,
  limit = 8
): ShowcaseCandidate[] {
  const ranked = projects
    .map((p) => {
      const readinessScore = p.startupReadiness?.overall ?? 0;
      const healthScore = p.health?.score ?? 0;
      const engagementScore = Math.min(
        100,
        (p.followerCount || 0) * 3 + (p.postsThisWeek || 0) * 10 + (p.teamSize || 0) * 5
      );
      const profileCompleteness = clampScore(
        (p.desc?.length ? 30 : 0) +
          (p.logoUrl ? 25 : 0) +
          ((p.gallery?.length || 0) > 0 ? 20 : 0) +
          (p.teamSize ? 25 : 0)
      );
      const compositeScore =
        readinessScore * 0.3 +
        healthScore * 0.25 +
        engagementScore * 0.25 +
        profileCompleteness * 0.2;

      let badge: (typeof SHOWCASE_BADGES)[number] = SHOWCASE_BADGES[0];
      if (engagementScore >= 80) badge = SHOWCASE_BADGES[0];
      else if (healthScore >= 75 && readinessScore >= 60) badge = SHOWCASE_BADGES[1];
      else if (compositeScore >= 85) badge = SHOWCASE_BADGES[2];
      else if (engagementScore >= 60) badge = SHOWCASE_BADGES[3];

      return {
        projectId: p.id,
        name: p.name,
        slug: p.slug,
        categoryId: p.categoryId,
        ownerContact: p.ownerContact,
        ownerName: p.ownerName,
        logoUrl: p.logoUrl,
        readinessScore,
        healthScore,
        engagementScore,
        profileCompleteness,
        compositeScore,
        badge,
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore);

  return ranked.slice(0, limit);
}

function clampScore(n: number) {
  return Math.round(Math.max(0, Math.min(100, n)));
}
