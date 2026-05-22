export const ALLOWED_PROJECT_PATTERNS = [
  /campus\s*food\s*delivery/i,
  /blood\s*bank/i,
  /^make\s*big$/i,
  /make\s*big\s*platform/i,
];

export function isAllowedPublicProject(project: { name?: string }): boolean {
  const name = String(project?.name || '').trim();
  if (!name) return false;
  return ALLOWED_PROJECT_PATTERNS.some((re) => re.test(name));
}

export function filterAllowedProjects<T extends { name?: string }>(projects: T[]): T[] {
  return projects.filter(isAllowedPublicProject);
}
