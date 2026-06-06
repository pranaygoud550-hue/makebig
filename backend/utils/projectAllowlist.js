/** Hide obvious junk/test names from public browse — all real projects are shown. */
const BLOCKED_PROJECT_PATTERNS = [
  /^test\s*project$/i,
  /^asdf+$/i,
  /^xxx+$/i,
];

export function isAllowedPublicProject(project) {
  const name = String(project?.name || "").trim();
  if (!name) return false;
  return !BLOCKED_PROJECT_PATTERNS.some((re) => re.test(name));
}

export function filterAllowedProjects(projects) {
  return (projects || []).filter(isAllowedPublicProject);
}
