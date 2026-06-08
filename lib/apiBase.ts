/** Render Express API — split deploy with Vercel frontend (see vercel.json). */
const PRODUCTION_RENDER_API = 'https://makebig.onrender.com';

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
    // Vercel UI → Render API (friend requests, join, tasks, sockets, etc.)
    if (hostname.endsWith('.vercel.app')) {
      return PRODUCTION_RENDER_API;
    }
    return origin;
  }

  return 'http://localhost:5001';
}

/** Browser calls same-origin BFF proxy; server/SSR calls Render/Express directly. */
export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    return '/api/backend';
  }
  return `${getApiOrigin()}/api`;
}

/** Authenticated client fetch path — always same-origin on Vercel (cookie + BFF proxy). */
export function clientApiUrl(apiPath: string): string {
  const normalized = apiPath.replace(/^\/api\//, '').replace(/^\//, '');
  if (typeof window !== 'undefined') {
    return `/api/backend/${normalized}`;
  }
  return `${getApiOrigin()}/api/${normalized}`;
}

/** Root for authenticated API calls from the browser (BFF) or server (Render). */
export function getClientApiRoot(): string {
  if (typeof window !== 'undefined') return '/api/backend';
  return `${getApiOrigin()}/api`;
}
