/** Demo seed identifiers — keep in sync with scripts/demo-data.mjs */

export const DEMO_CONTACTS = [
  'priya@demo.makebig.in',
  'arjun@demo.makebig.in',
  'sneha@demo.makebig.in',
  'rahul@demo.makebig.in',
  'kavya@demo.makebig.in',
  'vikram@demo.makebig.in',
  'ananya@demo.makebig.in',
  'rohan@demo.makebig.in',
  'meera@demo.makebig.in',
  'aditya@demo.makebig.in',
];

export const DEMO_PROJECT_SLUGS = [
  'studysync-web-portal-hyderabad',
  'campusride-mobile-bangalore',
  'ai-study-buddy-pune',
  'brandkit-design-system-mumbai',
  'healthtrack-campus-chennai',
  'pixelquest-game-delhi',
  'growthlaunch-marketing-hub-hyderabad',
  'datadash-analytics-bangalore',
  'shortfilm-collab-kochi',
  'cloudcamp-devops-kit-hyderabad',
];

export const DEMO_CONTACT_PATTERN = /@demo\.makebig\.in$/i;

export function isDemoContact(contact?: string | null): boolean {
  return DEMO_CONTACT_PATTERN.test(String(contact || '').trim());
}

export function isDemoProject(project: { slug?: string; ownerContact?: string }): boolean {
  const slug = String(project?.slug || '').trim();
  const owner = String(project?.ownerContact || '').trim();
  if (DEMO_PROJECT_SLUGS.includes(slug)) return true;
  if (isDemoContact(owner)) return true;
  return false;
}

/** Showcase demos are visible in browse/explore; junk test names still blocked separately. */
export function isShowcaseDemoProject(project: { slug?: string; ownerContact?: string }): boolean {
  return isDemoProject(project);
}
