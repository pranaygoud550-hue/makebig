import type { SkillBadgeLevel } from './types';

export function badgeFromScore(score: number): {
  badge: SkillBadgeLevel;
  badgeLabel: string;
  badgeIcon: string;
} {
  if (score >= 95) return { badge: 'expert', badgeLabel: 'Expert', badgeIcon: '🏆' };
  if (score >= 80) return { badge: 'advanced', badgeLabel: 'Advanced', badgeIcon: '🥇' };
  if (score >= 65) return { badge: 'intermediate', badgeLabel: 'Intermediate', badgeIcon: '🥈' };
  if (score >= 50) return { badge: 'beginner', badgeLabel: 'Beginner', badgeIcon: '🥉' };
  return { badge: 'not_verified', badgeLabel: 'Not Verified', badgeIcon: '—' };
}

/** MCQ 40% + Practical 60% */
export function calculateSkillScore(mcqScore: number, practicalScore: number): number {
  const total = mcqScore * 0.4 + practicalScore * 0.6;
  return Math.round(Math.max(0, Math.min(100, total)));
}

export function scoreAnswers(correct: number, total: number): number {
  if (!total) return 0;
  return Math.round((correct / total) * 100);
}
