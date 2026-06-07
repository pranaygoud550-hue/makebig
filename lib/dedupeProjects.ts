/** Dedupe by Mongo id, then slug, then name (first occurrence wins). */
export function dedupeById<
  T extends { id?: string; _id?: string; slug?: string; name?: string },
>(items: T[]): T[] {
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const seenNames = new Set<string>();

  return (items || []).filter((p) => {
    const id = String(p.id || p._id || '').trim();
    const slug = String(p.slug || '').trim().toLowerCase();
    const name = String(p.name || '').trim().toLowerCase();

    if (id && seenIds.has(id)) return false;
    if (slug && seenSlugs.has(slug)) return false;
    if (name && seenNames.has(name)) return false;

    if (id) seenIds.add(id);
    if (slug) seenSlugs.add(slug);
    if (name) seenNames.add(name);
    return true;
  });
}

/** @deprecated Use dedupeById */
export const dedupeProjectsById = dedupeById;

/** Hide duplicate creates (same owner + name, different ids). Keeps the first occurrence. */
export function dedupeProjectsForDisplay<
  T extends {
    id?: string;
    _id?: string;
    slug?: string;
    name?: string;
    ownerContact?: string;
  },
>(items: T[]): T[] {
  const byId = dedupeById(items);
  const seen = new Set<string>();
  return byId.filter((p) => {
    const owner = String(p.ownerContact || '').trim().toLowerCase();
    const name = String(p.name || '').trim().toLowerCase();
    const key = owner ? `${owner}::${name}` : name;
    if (!name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
