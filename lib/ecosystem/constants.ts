export const JOURNEY_STAGES = [
  { id: 'idea', label: 'Idea Stage' },
  { id: 'research', label: 'Research' },
  { id: 'prototype', label: 'Prototype' },
  { id: 'mvp', label: 'MVP' },
  { id: 'beta', label: 'Beta Testing' },
  { id: 'launch', label: 'Launch' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'scaling', label: 'Scaling' },
] as const;

export type JourneyStageId = (typeof JOURNEY_STAGES)[number]['id'];

export const INVITE_ROLE_TYPES = [
  'Developer',
  'Designer',
  'AI Engineer',
  'Marketing',
  'Product Manager',
  'Content Creator',
  'Business Development',
] as const;

export const REPUTATION_LEVELS = [
  { min: 0, max: 100, id: 'explorer', label: 'Explorer', icon: '🧭' },
  { min: 101, max: 300, id: 'builder', label: 'Builder', icon: '🔨' },
  { min: 301, max: 700, id: 'innovator', label: 'Innovator', icon: '💡' },
  { min: 701, max: 1500, id: 'founder', label: 'Founder', icon: '🚀' },
  { min: 1501, max: Infinity, id: 'visionary', label: 'Visionary', icon: '🌟' },
] as const;

export const HEALTH_LEVELS = [
  { min: 90, label: 'Excellent', icon: '🟢', color: 'green' },
  { min: 70, label: 'Good', icon: '🟡', color: 'yellow' },
  { min: 50, label: 'Needs Attention', icon: '🟠', color: 'orange' },
  { min: 0, label: 'At Risk', icon: '🔴', color: 'red' },
] as const;

export const SHOWCASE_BADGES = [
  { id: 'trending', label: 'Trending', icon: '🔥' },
  { id: 'fast_growing', label: 'Fast Growing', icon: '🚀' },
  { id: 'startup_of_week', label: 'Startup of the Week', icon: '🏆' },
  { id: 'most_active', label: 'Most Active Team', icon: '⭐' },
] as const;

/** Future ecosystem modules — architecture hooks */
export const ECOSYSTEM_MODULES = [
  'investor_discovery',
  'startup_funding',
  'recruiter_access',
  'talent_marketplace',
  'accelerator_programs',
  'startup_competitions',
  'hackathons',
  'founder_communities',
  'cofounder_matching',
  'startup_incubation',
] as const;
