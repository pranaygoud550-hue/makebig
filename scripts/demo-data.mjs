/** Shared demo seed identifiers — keep in sync with scripts/seed-demo.mjs */

export const DEMO_CONTACTS = [
  'priya@demo.makebig.in',
  'arjun@demo.makebig.in',
  'team@demo.makebig.in',
  'sneha@demo.makebig.in',
  'rahul@demo.makebig.in',
];

export const DEMO_PROJECT_SLUGS = [
  'campus-food-delivery-hyderabad',
  'blood-bank-network-bangalore',
  'make-big-platform-hyderabad',
];

export const DEMO_CONTACT_PATTERN = /@demo\.makebig\.in$/i;

export function isDemoContact(contact) {
  return DEMO_CONTACT_PATTERN.test(String(contact || '').trim());
}

export function isDemoProject(project) {
  const slug = String(project?.slug || '').trim();
  const owner = String(project?.ownerContact || '').trim();
  if (DEMO_PROJECT_SLUGS.includes(slug)) return true;
  if (isDemoContact(owner)) return true;
  return false;
}
