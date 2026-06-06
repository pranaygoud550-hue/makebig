import { HEALTH_LEVELS } from './constants';

export interface HealthMetrics {
  activeMembers: number;
  lastActivityAt: string | null;
  openTasks: number;
  completedTasks: number;
  updatesThisWeek: number;
  joinRequests: number;
  responseTimeHours: number;
}

export interface HealthScore {
  score: number;
  activity: number;
  engagement: number;
  progress: number;
  taskCompletion: number;
  level: (typeof HEALTH_LEVELS)[number];
  metrics: HealthMetrics;
  heatmap: Array<{ date: string; count: number }>;
  computedAt: string;
}

function clamp(n: number) {
  return Math.round(Math.max(0, Math.min(100, n)));
}

export function healthLevel(score: number) {
  return HEALTH_LEVELS.find((l) => score >= l.min) || HEALTH_LEVELS[HEALTH_LEVELS.length - 1];
}

export function computeHealthScore(input: {
  tasks?: Array<{ status?: string }>;
  teamMembers?: Array<{ status?: string }>;
  postsThisWeek?: number;
  activitiesThisWeek?: number;
  joinRequestsPending?: number;
  lastActivityAt?: Date | string | null;
  journeyCompletion?: number;
  heatmap?: Array<{ date: string; count: number }>;
}): HealthScore {
  const tasks = input.tasks || [];
  const done = tasks.filter((t) => t.status === 'done').length;
  const open = tasks.filter((t) => t.status !== 'done').length;
  const total = tasks.length || 1;

  const joined = (input.teamMembers || []).filter((m) => m.status === 'joined').length;
  const activeMembers = joined + 1;

  const taskCompletion = clamp((done / total) * 100);
  const progress = clamp((input.journeyCompletion ?? 0) * 0.6 + taskCompletion * 0.4);

  const updatesThisWeek = (input.postsThisWeek || 0) + (input.activitiesThisWeek || 0);
  const activity = clamp(Math.min(100, updatesThisWeek * 15 + (input.heatmap?.slice(-7).reduce((s, h) => s + h.count, 0) || 0) * 5));

  const engagement = clamp(
    activeMembers * 12 +
      Math.min(40, updatesThisWeek * 8) +
      Math.max(0, 30 - (input.joinRequestsPending || 0) * 5)
  );

  const score = clamp((activity + engagement + progress + taskCompletion) / 4);

  const lastActivityAt = input.lastActivityAt
    ? new Date(input.lastActivityAt).toISOString()
    : null;

  const daysSinceActivity = lastActivityAt
    ? (Date.now() - new Date(lastActivityAt).getTime()) / 86400000
    : 999;
  const responseTimeHours = Math.min(168, Math.round(daysSinceActivity * 24));

  return {
    score,
    activity,
    engagement,
    progress,
    taskCompletion,
    level: healthLevel(score),
    metrics: {
      activeMembers,
      lastActivityAt,
      openTasks: open,
      completedTasks: done,
      updatesThisWeek,
      joinRequests: input.joinRequestsPending || 0,
      responseTimeHours,
    },
    heatmap: input.heatmap || [],
    computedAt: new Date().toISOString(),
  };
}

/** Build 52-week heatmap from activity dates */
export function buildHeatmap(events: Array<{ createdAt?: Date | string }>): Array<{ date: string; count: number }> {
  const counts: Record<string, number> = {};
  const now = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    counts[d.toISOString().slice(0, 10)] = 0;
  }
  for (const e of events) {
    if (!e.createdAt) continue;
    const key = new Date(e.createdAt).toISOString().slice(0, 10);
    if (key in counts) counts[key] += 1;
  }
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}
