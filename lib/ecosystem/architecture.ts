import { ECOSYSTEM_MODULES } from './constants';

/**
 * Long-term startup ecosystem architecture.
 * Each module is a future extension point with shared primitives:
 * User.contact, Project.slug, Notification, Activity, Reputation, StartupFollow.
 */
export const ECOSYSTEM_ARCHITECTURE = {
  modules: ECOSYSTEM_MODULES.map((id) => ({
    id,
    status: 'planned' as const,
    dependsOn: ['users', 'projects', 'notifications', 'reputation'],
  })),
  sharedServices: [
    'pushNotification',
    'computeUserReputation',
    'computeProjectHealth',
    'computeStartupReadiness',
    'getFeaturedStartups',
    'startup-feed',
  ],
  publicRoutes: ['/startup/[slug]', '/p/[slug]', '/u/[contact]', '/idea-validator'],
  dataModels: [
    'Project.journey',
    'Project.health',
    'Project.startupReadiness',
    'Project.featured',
    'User.reputation',
    'StartupFollow',
    'StartupBookmark',
    'IdeaValidation',
    'Activity',
    'Notification',
  ],
} as const;
