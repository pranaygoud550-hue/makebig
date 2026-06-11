/** Indian college / academic email domains for verification badge */
const COLLEGE_EMAIL_PATTERNS = [
  /\.ac\.in$/i,
  /\.edu$/i,
  /\.edu\.in$/i,
  /\.ac\.[a-z]{2}$/i,
];

export function isCollegeEmail(contact?: string | null): boolean {
  const email = String(contact || '').trim().toLowerCase();
  if (!email.includes('@')) return false;
  return COLLEGE_EMAIL_PATTERNS.some((re) => re.test(email));
}
