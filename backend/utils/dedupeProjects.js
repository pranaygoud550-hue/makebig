import { normalizeContact } from "./helpers.js";

export function dedupeProjectsById(projects) {
  const seen = new Set();
  return (projects || []).filter((p) => {
    const id = String(p._id || p.id || "").trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function dedupeProjectsForDisplay(projects) {
  const byId = dedupeProjectsById(projects);
  const seen = new Set();
  return byId.filter((p) => {
    const owner = normalizeContact(p.ownerContact || "");
    const name = String(p.name || "").trim().toLowerCase();
    const key = owner ? `${owner}::${name}` : name;
    if (!name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
