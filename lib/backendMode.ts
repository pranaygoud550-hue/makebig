/**
 * Data backend selection for Make Big.
 *
 * - `mongo` — Express API (port 5001) + MongoDB + Socket.io (original flow)
 * - `supabase` — Supabase Postgres + client SDK (migration path)
 *
 * Set in `.env`:
 *   NEXT_PUBLIC_DATA_BACKEND=mongo
 */
export type DataBackend = 'mongo' | 'supabase';

export function getDataBackend(): DataBackend {
  const raw = (process.env.NEXT_PUBLIC_DATA_BACKEND || '').trim().toLowerCase();
  if (raw === 'mongo' || raw === 'supabase') return raw;
  // Default: original Mongo + Express stack (set supabase explicitly to migrate)
  return 'mongo';
}

export function isMongoBackendMode(): boolean {
  return getDataBackend() === 'mongo';
}

export function isSupabaseBackendMode(): boolean {
  return getDataBackend() === 'supabase';
}
