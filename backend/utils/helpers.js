export function normalizeContact(contact) {
  return String(contact || "").trim().toLowerCase();
}

export function normalizeSkill(skill) {
  return String(skill || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function getInitials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatResponse(success, data = null, error = null) {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString(),
  };
}
