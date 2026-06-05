import type { DataBackend } from './backendMode';

/**
 * Server-side backend selection (API routes, SSR).
 * Defaults to Mongo/Express unless NEXT_PUBLIC_DATA_BACKEND=supabase.
 */
export function getDataBackendServer(): DataBackend {
  const raw = (process.env.NEXT_PUBLIC_DATA_BACKEND || '').trim().toLowerCase();
  if (raw === 'mongo' || raw === 'supabase') return raw;
  return 'mongo';
}

export function isMongoBackendModeServer(): boolean {
  return getDataBackendServer() === 'mongo';
}
