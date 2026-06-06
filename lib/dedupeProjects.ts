/** Keep one row per project id. */
export function dedupeProjectsById<T extends { id?: string; _id?: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return (items || []).filter((p) => {
    const id = String(p.id || p._id || '').trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** Hide duplicate creates (same owner + name, different ids). Keeps the first occurrence. */
export function dedupeProjectsForDisplay<
  T extends { id?: string; _id?: string; name?: string; ownerContact?: string },
>(items: T[]): T[] {
  const byId = dedupeProjectsById(items);
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
