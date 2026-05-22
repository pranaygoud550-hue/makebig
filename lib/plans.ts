export type PlanTier = 'free' | 'pro';

export const PLAN_LIMITS = {
  free: {
    maxActiveProjects: 2,
    maxTeamMembersPerProject: Infinity,
    maxMatchResults: 5,
  },
  pro: {
    maxActiveProjects: Infinity,
    maxTeamMembersPerProject: Infinity,
    maxMatchResults: 30,
  },
} as const;

export const ACTIVE_PROJECT_STATUSES = ['draft', 'published', 'in-progress'] as const;

export const PLAN_FEATURES = {
  free: {
    label: 'Free',
    price: '₹0',
    period: 'forever',
    highlights: [
      '2 active projects',
      'Unlimited team members',
      'Core collaboration tools',
      'Public project discovery',
      'AI Coder (demo mode)',
    ],
  },
  pro: {
    label: 'Pro',
    price: '₹499',
    period: '/month',
    highlights: [
      'Unlimited active projects',
      'Unlimited team members',
      'AI Co-founder assistant',
      'Priority co-founder matching',
      'Early access to new features',
    ],
  },
} as const;

export function isPro(plan: PlanTier | string | undefined | null): boolean {
  return plan === 'pro';
}
