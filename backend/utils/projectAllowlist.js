/** Public/demo projects shown in browse, search, explore, and join flows. */
export const ALLOWED_PROJECT_PATTERNS = [
  /campus\s*food\s*delivery/i,
  /blood\s*bank/i,
  /^make\s*big$/i,
  /make\s*big\s*platform/i,
];

export function isAllowedPublicProject(project) {
  const name = String(project?.name || "").trim();
  if (!name) return false;
  return ALLOWED_PROJECT_PATTERNS.some((re) => re.test(name));
}

export function filterAllowedProjects(projects) {
  return (projects || []).filter(isAllowedPublicProject);
}
