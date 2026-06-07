const URL_REGEX =
  /https?:\/\/[^\s<>"')\]]+|(?:^|\s)([a-zA-Z0-9][-a-zA-Z0-9]*\.)+[a-zA-Z]{2,}(?:\/[^\s<>"')\]]*)?/gi;

export function extractUrls(text: string): string[] {
  if (!text?.trim()) return [];
  const found = new Set<string>();
  const matches = text.match(URL_REGEX) || [];
  for (let m of matches) {
    m = m.trim();
    if (!m.startsWith('http')) m = `https://${m}`;
    try {
      const u = new URL(m);
      if (['http:', 'https:'].includes(u.protocol)) found.add(u.href);
    } catch {
      /* skip invalid */
    }
  }
  return [...found];
}

export function getDomain(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function truncateUrl(url: string, max = 40): string {
  if (url.length <= max) return url;
  return `${url.slice(0, max - 1)}…`;
}

export function faviconUrl(url: string): string {
  const domain = getDomain(url);
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export function isGitHubRepoUrl(url: string): boolean {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (!u.hostname.includes('github.com')) return false;
    const parts = u.pathname.split('/').filter(Boolean);
    return parts.length >= 2;
  } catch {
    return false;
  }
}

export const COMPETITOR_QUESTION =
  'Analyze this as a competitor to our startup. What are they doing well? What are their weaknesses? How should we position against them? What features should we copy or avoid?';
