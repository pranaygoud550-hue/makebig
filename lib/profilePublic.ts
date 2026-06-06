import type { VerifiedSkill } from '@/lib/types';

export interface ProfileBadge {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export interface ProfileProjectHistory {
  id: string;
  name: string;
  desc?: string;
  categoryId?: string;
  slug?: string;
  status?: string;
  relation: 'owner' | 'member';
  roles?: string[];
  city?: string;
  updatedAt?: string;
}

export interface PublicProfilePayload {
  user: {
    name: string;
    contact: string;
    college?: string;
    graduationYear?: string;
    city?: string;
    state?: string;
    skills?: string[];
    verifiedSkills?: VerifiedSkill[];
    hobbies?: string[];
    plan?: string;
  };
  profile: {
    tagline?: string;
    bio?: string;
    profileImage?: string;
    portfolio?: string;
    portfolioLinks?: string[];
    role?: string;
    categoryIds?: string[];
    skills?: string[];
    availableForInvites?: boolean;
    rateMin?: number | null;
    rateMax?: number | null;
    currency?: string;
    workRatingAvg?: number;
    workRatingCount?: number;
  } | null;
  projects: ProfileProjectHistory[];
  badges: ProfileBadge[];
  stats?: {
    projectsLed: number;
    projectsJoined: number;
    tasksCompleted: number;
  };
}

export function parsePortfolioLinks(raw?: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatPortfolioHref(link: string): string {
  if (link.startsWith('http://') || link.startsWith('https://')) return link;
  return `https://${link}`;
}
