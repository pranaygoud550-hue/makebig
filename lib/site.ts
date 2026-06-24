/** Canonical site URL for SEO, OG tags, and share links. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://makebig.vercel.app';

export function projectPublicPath(slug: string) {
  return `/p/${slug}`;
}

export function projectPublicUrl(slug: string) {
  return `${SITE_URL.replace(/\/$/, '')}/p/${slug}`;
}

export function slugifyProjectName(name?: string, city?: string) {
  const base = [name || 'project', city || ''].join(' ');
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
