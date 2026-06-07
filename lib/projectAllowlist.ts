import { isDemoProject } from '@/lib/demoData';

/** Hide obvious junk/test names from public browse — all real projects are shown. */
const BLOCKED_PROJECT_PATTERNS = [
  /^test\s*project$/i,
  /^asdf+$/i,
  /^xxx+$/i,
];

export function isAllowedPublicProject(project: {
  name?: string;
  slug?: string;
  ownerContact?: string;
}): boolean {
  if (isDemoProject(project)) return false;
  const name = String(project?.name || '').trim();
  if (!name) return false;
  return !BLOCKED_PROJECT_PATTERNS.some((re) => re.test(name));
}

export function filterAllowedProjects<T extends { name?: string }>(projects: T[]): T[] {
  return projects.filter(isAllowedPublicProject);
}
