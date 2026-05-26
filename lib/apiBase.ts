/**
 * Resolve Express API origin for browser, SSR, and unified Render deploy (SERVE_NEXT).
 */
export function getApiOrigin(): string {
  const internal = process.env.INTERNAL_API_URL?.replace(/\/$/, '');
  if (internal) return internal;

  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (publicUrl) return publicUrl;

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost:5001';
}

export function getApiBase(): string {
  return `${getApiOrigin()}/api`;
}
