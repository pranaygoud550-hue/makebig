import { PlanTier, PLAN_LIMITS, ACTIVE_PROJECT_STATUSES, isPro } from './plans';
import { isSupabaseConfigured, supabase } from './supabase';

import { getApiBase } from '@/lib/apiBase';

const API_BASE = getApiBase();

export class PlanLimitError extends Error {
  code = 'PLAN_LIMIT' as const;
  upgradeUrl = '/pricing';

  constructor(message: string) {
    super(message);
    this.name = 'PlanLimitError';
  }
}

export function normalizePlan(plan: string | null | undefined): PlanTier {
  return plan === 'pro' ? 'pro' : 'free';
}

export async function getPlanForContact(contact: string): Promise<PlanTier> {
  const normalized = contact.toLowerCase().trim();
  if (!normalized) return 'free';

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('users')
      .select('plan')
      .eq('contact', normalized)
      .maybeSingle();
    if (!error && data?.plan) return normalizePlan(data.plan);
  }

  try {
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(normalized)}`);
    if (res.ok) {
      const json = await res.json();
      return normalizePlan(json?.data?.user?.plan);
    }
  } catch {
    /* API offline */
  }

  return 'free';
}

export async function countActiveProjectsForOwner(ownerContact: string): Promise<number> {
  const normalized = ownerContact.toLowerCase().trim();

  if (isSupabaseConfigured) {
    const { count, error } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('owner_contact', normalized)
      .in('status', [...ACTIVE_PROJECT_STATUSES]);
    if (!error && typeof count === 'number') return count;
  }

  try {
    const res = await fetch(
      `${API_BASE}/projects?ownerContact=${encodeURIComponent(normalized)}`
    );
    if (res.ok) {
      const json = await res.json();
      const projects: { status?: string }[] = json?.data?.projects || [];
      return projects.filter((p) =>
        ACTIVE_PROJECT_STATUSES.includes(p.status as (typeof ACTIVE_PROJECT_STATUSES)[number])
      ).length;
    }
  } catch {
    /* API offline */
  }

  return 0;
}

export async function countTeamMembersForProject(projectId: string): Promise<number> {
  if (isSupabaseConfigured) {
    const { count, error } = await supabase
      .from('project_members')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', 'joined');
    if (!error && typeof count === 'number') return count;
  }

  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/members`);
    if (res.ok) {
      const json = await res.json();
      const members: unknown[] = json?.data?.members || [];
      return members.length;
    }
  } catch {
    /* API offline */
  }

  return 0;
}

export async function assertCanCreateProject(ownerContact: string): Promise<void> {
  const plan = await getPlanForContact(ownerContact);
  if (isPro(plan)) return;

  const count = await countActiveProjectsForOwner(ownerContact);
  if (count >= PLAN_LIMITS.free.maxActiveProjects) {
    throw new PlanLimitError(
      `Free plan includes ${PLAN_LIMITS.free.maxActiveProjects} active projects. Upgrade to Pro for unlimited projects.`
    );
  }
}

export async function assertCanAddTeamMember(
  _projectId: string,
  _ownerContact: string
): Promise<void> {
  /* Free and Pro: unlimited team members per project */
}

export function assertProFeature(plan: PlanTier, feature: string): void {
  if (isPro(plan)) return;
  throw new PlanLimitError(
    `${feature} is a Pro feature. Upgrade to unlock AI tools and priority matching.`
  );
}
