import { REPUTATION_LEVELS } from './constants';

export interface ReputationState {
  score: number;
  level: (typeof REPUTATION_LEVELS)[number];
  points: {
    projectsCreated: number;
    tasksCompleted: number;
    teamsHelped: number;
    positiveReviews: number;
    activityStreak: number;
    milestonesCompleted: number;
    verifiedSkills: number;
    successfulLaunches: number;
  };
  achievements: string[];
  badges: Array<{ id: string; label: string; icon: string }>;
}

const POINT_VALUES = {
  projectCreated: 25,
  taskCompleted: 5,
  teamHelped: 15,
  positiveReview: 20,
  activityDay: 2,
  milestone: 30,
  verifiedSkill: 40,
  launch: 100,
};

export function reputationLevel(score: number) {
  return (
    REPUTATION_LEVELS.find((l) => score >= l.min && score <= l.max) ||
    REPUTATION_LEVELS[REPUTATION_LEVELS.length - 1]
  );
}

export function computeReputation(input: {
  projectsCreated?: number;
  tasksCompleted?: number;
  teamsHelped?: number;
  positiveReviews?: number;
  activityStreak?: number;
  milestonesCompleted?: number;
  verifiedSkills?: number;
  successfulLaunches?: number;
}): ReputationState {
  const points = {
    projectsCreated: (input.projectsCreated || 0) * POINT_VALUES.projectCreated,
    tasksCompleted: (input.tasksCompleted || 0) * POINT_VALUES.taskCompleted,
    teamsHelped: (input.teamsHelped || 0) * POINT_VALUES.teamHelped,
    positiveReviews: (input.positiveReviews || 0) * POINT_VALUES.positiveReview,
    activityStreak: (input.activityStreak || 0) * POINT_VALUES.activityDay,
    milestonesCompleted: (input.milestonesCompleted || 0) * POINT_VALUES.milestone,
    verifiedSkills: (input.verifiedSkills || 0) * POINT_VALUES.verifiedSkill,
    successfulLaunches: (input.successfulLaunches || 0) * POINT_VALUES.launch,
  };

  const score = Object.values(points).reduce((a, b) => a + b, 0);
  const level = reputationLevel(score);

  const achievements: string[] = [];
  const badges: Array<{ id: string; label: string; icon: string }> = [];

  if (input.projectsCreated && input.projectsCreated >= 2) {
    achievements.push('serial_builder');
    badges.push({ id: 'startup_builder', label: 'Startup Builder', icon: '🚀' });
  }
  if (input.teamsHelped && input.teamsHelped >= 3) {
    badges.push({ id: 'collaborator', label: 'Great Collaborator', icon: '🤝' });
  }
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
    achievements,
    badges,
  };
}
