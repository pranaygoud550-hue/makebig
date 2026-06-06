import type { Profile, User } from './types';

/** Minimum account fields required before join/create/actions. */
export function isUserAccountReady(user: User | null | undefined): boolean {
  if (!user?.contact?.trim() || !user.name?.trim()) return false;
  if (!user.skills?.length) return false;
  if (!user.college?.trim()) return false;
  return true;
}

/** Rich public profile — tagline + bio for a real-world feel. */
export function isPublicProfileReady(profile: Profile | null | undefined): boolean {
  if (!profile?.contact?.trim()) return false;
  if (!profile.tagline?.trim()) return false;
  if (!profile.bio?.trim()) return false;
  return true;
}

export function profileReadyMessage(user: User | null, profile: Profile | null): string | null {
  if (!user) return 'Sign in to continue';
  if (!isUserAccountReady(user)) {
    return 'Complete your profile (name, college, skills) before joining a project';
  }
  if (!isPublicProfileReady(profile)) {
    return 'Add a tagline and bio to your profile before joining a project';
  }
  return null;
}
