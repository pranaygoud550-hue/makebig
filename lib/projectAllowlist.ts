/** Hide obvious junk/test names from public browse — showcase demo projects are allowed. */
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
  const name = String(project?.name || '').trim();
  if (!name) return false;
  return !BLOCKED_PROJECT_PATTERNS.some((re) => re.test(name));
}

export function filterAllowedProjects<T extends { name?: string }>(projects: T[]): T[] {
  return projects.filter(isAllowedPublicProject);
}
