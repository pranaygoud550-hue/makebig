/**
 * Resolve Express API origin for browser, SSR, and unified Render deploy (SERVE_NEXT).
 */
export function getApiOrigin(): string {
  const internal = process.env.INTERNAL_API_URL?.replace(/\/$/, '');
  if (internal) return internal;

  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (publicUrl) return publicUrl;

  if (typeof window !== 'undefined') {
    const { hostname, port, origin } = window.location;
    // Local dev: Next.js :3000 → Express API :5001
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '3000') {
      return 'http://localhost:5001';
    }
    return origin;
  }

  return 'http://localhost:5001';
}

export function getApiBase(): string {
  return `${getApiOrigin()}/api`;
}
