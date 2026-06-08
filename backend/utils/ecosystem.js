/** Ecosystem compute utilities for Express (mirrors lib/ecosystem/*.ts) */

export const JOURNEY_STAGES = [
  { id: 'idea', label: 'Idea Stage' },
  { id: 'research', label: 'Research' },
  { id: 'prototype', label: 'Prototype' },
  { id: 'mvp', label: 'MVP' },
  { id: 'beta', label: 'Beta Testing' },
  { id: 'launch', label: 'Launch' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'scaling', label: 'Scaling' },
];

export const INVITE_ROLE_TYPES = [
  'Developer', 'Designer', 'AI Engineer', 'Marketing',
  'Product Manager', 'Content Creator', 'Business Development',
];

const HEALTH_LEVELS = [
  { min: 90, label: 'Excellent', icon: '🟢' },
  { min: 70, label: 'Good', icon: '🟡' },
  { min: 50, label: 'Needs Attention', icon: '🟠' },
  { min: 0, label: 'At Risk', icon: '🔴' },
];

const REPUTATION_LEVELS = [
  { min: 0, max: 100, id: 'explorer', label: 'Explorer', icon: '🧭' },
  { min: 101, max: 300, id: 'builder', label: 'Builder', icon: '🔨' },
  { min: 301, max: 700, id: 'innovator', label: 'Innovator', icon: '💡' },
  { min: 701, max: 1500, id: 'founder', label: 'Founder', icon: '🚀' },
  { min: 1501, max: Infinity, id: 'visionary', label: 'Visionary', icon: '🌟' },
];

function clamp(n) {
  return Math.round(Math.max(0, Math.min(100, n)));
}

export function journeyTimeline(currentStage) {
  const idx = JOURNEY_STAGES.findIndex((s) => s.id === currentStage);
  return JOURNEY_STAGES.map((s, i) => ({
    ...s,
    status: i < idx ? 'completed' : i === idx ? 'current' : 'future',
  }));
}

const DEMO_NEXT_MILESTONE = 'Complete problem research';

export function isJourneyConfigured(journey) {
  if (!journey) return false;
  if (journey.configured === true) return true;
  if ((journey.stageNotes?.length || 0) > 0) return true;
  if ((journey.completionPercent || 0) > 0) return true;
  if (journey.currentStage && journey.currentStage !== 'idea') return true;
  if (journey.nextMilestone?.trim() && journey.nextMilestone !== DEMO_NEXT_MILESTONE) return true;
  return false;
}

export function sanitizeJourneyForApi(journey) {
  const configured = isJourneyConfigured(journey);
  if (!configured) {
    return {
      configured: false,
      journey: { currentStage: 'idea', completionPercent: 0, stageNotes: [] },
    };
  }
  const nextMilestone =
    journey?.nextMilestone === DEMO_NEXT_MILESTONE ? undefined : journey?.nextMilestone;
  return {
    configured: true,
    journey: {
      currentStage: journey?.currentStage || 'idea',
      completionPercent: journey?.completionPercent ?? 0,
      nextMilestone,
      lastUpdated: journey?.lastUpdated,
      stageNotes: journey?.stageNotes || [],
    },
  };
}

export function healthLevel(score) {
  return HEALTH_LEVELS.find((l) => score >= l.min) || HEALTH_LEVELS[HEALTH_LEVELS.length - 1];
}

export function buildHeatmap(events) {
  const counts = {};
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

export function computeHealthScore(input) {
  const tasks = input.tasks || [];
  const done = tasks.filter((t) => t.status === 'done').length;
  const open = tasks.filter((t) => t.status !== 'done').length;
  const joined = (input.teamMembers || []).filter((m) => m.status === 'joined').length;
  const activeMembers = joined + 1;
  const updatesThisWeek = (input.postsThisWeek || 0) + (input.activitiesThisWeek || 0);
  const hasActivity =
    tasks.length > 0 || updatesThisWeek > 0 || (input.heatmap?.slice(-7).reduce((s, h) => s + h.count, 0) || 0) > 0;

  if (!hasActivity) {
    return {
      score: 0,
      activity: 0,
      engagement: 0,
      progress: 0,
      taskCompletion: 0,
      level: healthLevel(0),
      metrics: {
        activeMembers,
        lastActivityAt: input.lastActivityAt ? new Date(input.lastActivityAt).toISOString() : null,
        openTasks: open,
        completedTasks: done,
        updatesThisWeek: 0,
        joinRequests: input.joinRequestsPending || 0,
        responseTimeHours: 0,
      },
      heatmap: input.heatmap || [],
      computedAt: new Date().toISOString(),
    };
  }

  const total = tasks.length || 1;
  const taskCompletion = clamp((done / total) * 100);
  const progress = clamp((input.journeyCompletion ?? 0) * 0.6 + taskCompletion * 0.4);
  const activity = clamp(Math.min(100, updatesThisWeek * 15 + (input.heatmap?.slice(-7).reduce((s, h) => s + h.count, 0) || 0) * 5));
  const engagement = clamp(Math.min(100, joined * 10 + Math.min(40, updatesThisWeek * 8) + Math.max(0, 30 - (input.joinRequestsPending || 0) * 5)));
  const score = clamp((activity + engagement + progress + taskCompletion) / 4);
  const lastActivityAt = input.lastActivityAt ? new Date(input.lastActivityAt).toISOString() : null;
  const daysSince = lastActivityAt ? (Date.now() - new Date(lastActivityAt).getTime()) / 86400000 : 999;

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
      responseTimeHours: Math.min(168, Math.round(daysSince * 24)),
    },
    heatmap: input.heatmap || [],
    computedAt: new Date().toISOString(),
  };
}

export function computeReputation(input) {
  const pv = { projectCreated: 25, taskCompleted: 5, teamHelped: 15, positiveReview: 20, activityDay: 2, milestone: 30, verifiedSkill: 40, launch: 100 };
  const points = {
    projectsCreated: (input.projectsCreated || 0) * pv.projectCreated,
    tasksCompleted: (input.tasksCompleted || 0) * pv.taskCompleted,
    teamsHelped: (input.teamsHelped || 0) * pv.teamHelped,
    positiveReviews: (input.positiveReviews || 0) * pv.positiveReview,
    activityStreak: (input.activityStreak || 0) * pv.activityDay,
    milestonesCompleted: (input.milestonesCompleted || 0) * pv.milestone,
    verifiedSkills: (input.verifiedSkills || 0) * pv.verifiedSkill,
    successfulLaunches: (input.successfulLaunches || 0) * pv.launch,
  };
  const score = Object.values(points).reduce((a, b) => a + b, 0);
  const level = REPUTATION_LEVELS.find((l) => score >= l.min && score <= l.max) || REPUTATION_LEVELS[REPUTATION_LEVELS.length - 1];
  const badges = [];
  if ((input.projectsCreated || 0) >= 2) badges.push({ id: 'startup_builder', label: 'Startup Builder', icon: '🚀' });
  if ((input.teamsHelped || 0) >= 3) badges.push({ id: 'collaborator', label: 'Great Collaborator', icon: '🤝' });
  if (score >= 700) badges.push({ id: 'top_founder', label: 'Top Founder', icon: '🏆' });
  if (score >= 300) badges.push({ id: 'contributor', label: 'Community Contributor', icon: '⭐' });
  if (score >= 1500) badges.push({ id: 'high_rep', label: 'High Reputation', icon: '🔥' });
  return {
    score,
    level,
    points: {
      projectsCreated: input.projectsCreated || 0,
      tasksCompleted: input.tasksCompleted || 0,
      teamsHelped: input.teamsHelped || 0,
      positiveReviews: input.positiveReviews || 0,
      activityStreak: input.activityStreak || 0,
      milestonesCompleted: input.milestonesCompleted || 0,
      verifiedSkills: input.verifiedSkills || 0,
      successfulLaunches: input.successfulLaunches || 0,
    },
    achievements: [],
    badges,
  };
}

export function weekStartDate(d = new Date()) {
  const date = new Date(d);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - day);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

export function rankShowcaseProjects(projects, limit = 8) {
  return projects
    .map((p) => {
      const readinessScore = p.startupReadiness?.overall ?? 0;
      const healthScore = p.health?.score ?? 0;
      const engagementScore = Math.min(100, (p.followerCount || 0) * 3 + (p.postsThisWeek || 0) * 10 + (p.teamSize || 0) * 5);
      const profileCompleteness = clamp((p.desc?.length ? 30 : 0) + (p.logoUrl ? 25 : 0) + ((p.gallery?.length || 0) > 0 ? 20 : 0) + (p.teamSize ? 25 : 0));
      const compositeScore = readinessScore * 0.3 + healthScore * 0.25 + engagementScore * 0.25 + profileCompleteness * 0.2;
      let badge = { id: 'trending', label: 'Trending', icon: '🔥' };
      if (compositeScore >= 85) badge = { id: 'startup_of_week', label: 'Startup of the Week', icon: '🏆' };
      else if (healthScore >= 75) badge = { id: 'fast_growing', label: 'Fast Growing', icon: '🚀' };
      else if (engagementScore >= 60) badge = { id: 'most_active', label: 'Most Active Team', icon: '⭐' };
      return { projectId: p.id, name: p.name, slug: p.slug, categoryId: p.categoryId, ownerContact: p.ownerContact, ownerName: p.ownerName, logoUrl: p.logoUrl, readinessScore, healthScore, engagementScore, profileCompleteness, compositeScore, badge };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, limit);
}

export async function computeProjectHealth(Project, User, Post, Activity, projectId) {
  const project = await Project.findById(projectId);
  if (!project) return null;

  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const [postsThisWeek, activitiesThisWeek, recentActivities] = await Promise.all([
    Post.countDocuments({ projectId: project._id, createdAt: { $gte: weekAgo } }),
    Activity.countDocuments({ projectId: project._id, createdAt: { $gte: weekAgo } }),
    Activity.find({ projectId: project._id }).sort({ createdAt: -1 }).limit(500).lean(),
  ]);

  const joinRequestsPending = (project.teamMembers || []).filter((m) => m.status === 'pending').length;
  const lastActivity = recentActivities[0];
  const heatmap = buildHeatmap(recentActivities);

  const health = computeHealthScore({
    tasks: project.tasks,
    teamMembers: project.teamMembers,
    postsThisWeek,
    activitiesThisWeek,
    joinRequestsPending,
    lastActivityAt: lastActivity?.createdAt || project.updatedAt,
    journeyCompletion: project.journey?.completionPercent ?? 0,
    heatmap,
  });

  project.health = health;
  await project.save();
  return health;
}

export async function computeUserReputation(User, Project, Profile, contact) {
  const normalized = contact.toLowerCase();
  const user = await User.findOne({ contact: normalized });
  if (!user) return null;

  const owned = await Project.countDocuments({ ownerContact: normalized });
  const joined = await Project.countDocuments({ 'teamMembers.contact': normalized, 'teamMembers.status': 'joined' });
  const profile = await Profile.findOne({ contact: normalized }).lean();
  const verifiedCount = (user.verifiedSkills || []).filter((s) => s.score >= 50).length;
  const launches = await Project.countDocuments({ ownerContact: normalized, 'journey.currentStage': { $in: ['launch', 'revenue', 'scaling'] } });

  let tasksCompleted = 0;
  const projects = await Project.find({ $or: [{ ownerContact: normalized }, { 'teamMembers.contact': normalized }] }).lean();
  for (const p of projects) {
    tasksCompleted += (p.tasks || []).filter((t) => t.status === 'done' && t.assignee === normalized).length;
  }

  const rep = computeReputation({
    projectsCreated: owned,
    tasksCompleted,
    teamsHelped: joined,
    positiveReviews: profile?.workRatingCount || 0,
    activityStreak: Math.min(30, user.reputation?.points?.activityStreak || 0),
    milestonesCompleted: user.reputation?.points?.milestonesCompleted || 0,
    verifiedSkills: verifiedCount,
    successfulLaunches: launches,
  });

  user.reputation = { ...rep, computedAt: new Date() };
  await user.save();
  return rep;
}

export async function getFeaturedStartups(Project, User, Post, limit = 8) {
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const projects = await Project.find({ status: { $in: ['published', 'in-progress'] } })
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  const enriched = await Promise.all(
    projects.map(async (p) => {
      const owner = await User.findOne({ contact: p.ownerContact }).lean();
      const postsThisWeek = await Post.countDocuments({ projectId: p._id, createdAt: { $gte: weekAgo } });
      const teamSize = (p.teamMembers || []).filter((m) => m.status === 'joined').length + 1;
      return {
        id: p._id.toString(),
        name: p.name,
        slug: p.slug,
        categoryId: p.categoryId,
        ownerContact: p.ownerContact,
        ownerName: owner?.name,
        logoUrl: p.logoUrl,
        desc: p.desc,
        gallery: p.gallery,
        startupReadiness: p.startupReadiness,
        health: p.health,
        followerCount: p.analytics?.followerCount || 0,
        postsThisWeek,
        teamSize,
      };
    })
  );

  const week = weekStartDate();
  const featured = rankShowcaseProjects(enriched, limit);
  for (const f of featured) {
    await Project.findByIdAndUpdate(f.projectId, {
      featured: { badge: f.badge.id, badgeIcon: f.badge.icon, weekStart: week, featuredAt: new Date(), rankScore: f.compositeScore },
    });
  }
  return { weekStart: week, featured };
}

export async function recordJourneyActivity(Activity, projectId, userId, stage, note, metadata = {}) {
  const stageLabels = Object.fromEntries(JOURNEY_STAGES.map((s) => [s.id, s.label]));
  return Activity.create({
    projectId,
    userId,
    type: 'journey_stage_changed',
    description: `Reached ${stageLabels[stage] || stage}${note ? `: ${note}` : ''}`,
    metadata: { stage, ...metadata },
  });
}

export async function notifyFollowers(pushNotification, getUserByContact, StartupFollow, User, project, type, title, message) {
  const follows = await StartupFollow.find({ projectId: project._id }).lean();
  for (const f of follows) {
    await pushNotification({
      contact: f.followerContact,
      projectId: project._id,
      type,
      title,
      message,
      actionUrl: `/startup/${project.slug}`,
    });
  }
}
