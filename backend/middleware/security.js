import { normalizeContact, formatResponse } from "../utils/helpers.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(contact) {
  const v = String(contact || "").trim();
  if (!v) return "Enter your email or phone number";
  if (v.includes("@")) {
    if (!EMAIL_RE.test(v)) return "Invalid email address";
    return null;
  }
  const digits = v.replace(/\D/g, "");
  if (!digits) return "Enter your phone number";
  if (digits.length < 10 || digits.length > 15) return "Invalid phone number — use 10 digits";
  return null;
}

export function validateName(name) {
  const v = String(name || "").trim();
  if (!v) return "Enter your full name";
  if (v.length < 2) return "Name is too short";
  if (v.length > 120) return "Name is too long";
  return null;
}

export function validateOtpCode(code) {
  const v = String(code || "").trim();
  if (!v) return "Enter the 6-digit OTP code";
  if (!/^\d{6}$/.test(v)) return "OTP must be 6 digits";
  return null;
}

export function clampString(value, maxLen) {
  if (value == null) return "";
  return String(value).trim().slice(0, maxLen);
}

export function clampStringArray(arr, maxItems = 30, maxLen = 80) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((s) => clampString(s, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function getAuthContact(req) {
  return normalizeContact(req.user?.contact || "");
}

export function requireAuthContact(req, res) {
  const contact = getAuthContact(req);
  if (!contact) {
    res.status(401).json(formatResponse(false, null, "Sign in again to continue"));
    return null;
  }
  return contact;
}

export function assertSameContact(req, res, contact) {
  const auth = getAuthContact(req);
  const normalized = normalizeContact(contact);
  if (!auth || auth !== normalized) {
    res.status(403).json(formatResponse(false, null, "You can only access your own account"));
    return false;
  }
  return true;
}

export function isProjectOwner(project, contact) {
  return normalizeContact(project.ownerContact) === normalizeContact(contact);
}

export function isProjectMember(project, contact) {
  const c = normalizeContact(contact);
  if (isProjectOwner(project, c)) return true;
  return (project.teamMembers || []).some(
    (m) => normalizeContact(m.contact) === c && m.status === "joined"
  );
}

export function isProjectPublic(project) {
  return project.status === "published" || project.status === "in-progress";
}

export function assertProjectOwner(req, res, project) {
  const contact = requireAuthContact(req, res);
  if (!contact) return false;
  if (!isProjectOwner(project, contact)) {
    res.status(403).json(formatResponse(false, null, "Only the project owner can do this"));
    return false;
  }
  return true;
}

export function assertProjectMember(req, res, project) {
  const contact = requireAuthContact(req, res);
  if (!contact) return false;
  if (!isProjectMember(project, contact)) {
    res.status(403).json(formatResponse(false, null, "You must join this project first"));
    return false;
  }
  return true;
}

export function assertProjectAccess(req, res, project) {
  if (isProjectPublic(project)) return true;
  return assertProjectMember(req, res, project);
}

export function sanitizeProjectUpdate(body) {
  const allowed = {};
  if (body.name != null) allowed.name = clampString(body.name, 120);
  if (body.desc != null) allowed.desc = clampString(body.desc, 2000);
  if (body.description != null) allowed.desc = clampString(body.description, 2000);
  if (body.categoryId != null) allowed.categoryId = clampString(body.categoryId, 64);
  if (body.roles != null) allowed.roles = clampStringArray(body.roles);
  if (body.city != null) allowed.city = clampString(body.city, 80);
  if (body.state != null) allowed.state = clampString(body.state, 80);
  if (body.salaryMin != null) allowed.salaryMin = Number(body.salaryMin) || 0;
  if (body.salaryMax != null) allowed.salaryMax = Number(body.salaryMax) || 0;
  if (body.currency != null) allowed.currency = clampString(body.currency, 8);
  if (body.maxTeamSize != null) allowed.maxTeamSize = Math.min(Math.max(Number(body.maxTeamSize) || 10, 2), 50);
  return allowed;
}

export function allowDevOtp() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_OTP === "true";
}

export function otpDeliveryConfigured(isPhone) {
  if (isPhone) {
    const key = process.env.FAST2SMS_API_KEY;
    return Boolean(key && !key.startsWith("your_"));
  }
  const user = process.env.EMAIL_FROM;
  const pass = process.env.EMAIL_PASS;
  return Boolean(user && pass && !user.startsWith("your_"));
}
