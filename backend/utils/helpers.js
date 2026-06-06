export function normalizeContact(contact) {
  const v = String(contact || "").trim().toLowerCase();
  if (!v) return "";
  if (v.includes("@")) return v;
  const digits = v.replace(/\D/g, "");
  if (digits.length >= 10) {
    if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
    return digits.length > 15 ? digits.slice(-15) : digits;
  }
  return digits || v;
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
