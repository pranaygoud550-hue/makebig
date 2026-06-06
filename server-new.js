import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __rootDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
// backend/.env overrides root placeholders (e.g. real GROQ_API_KEY)
dotenv.config({ path: path.join(__rootDir, "backend/.env"), override: true });

import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import Groq from "groq-sdk";

import { connectDB } from "./backend/db/connection.js";
import { corsMiddleware, socketCorsOptions } from "./backend/middleware/cors.js";
import { authMiddleware, socketAuthMiddleware } from "./backend/middleware/auth.js";
import {
  validateContact,
  validateName,
  validateOtpCode,
  clampString,
  clampStringArray,
  requireAuthContact,
  assertSameContact,
  assertProjectOwner,
  assertProjectMember,
  assertProjectAccess,
  sanitizeProjectUpdate,
  allowDevOtp,
  otpDeliveryConfigured,
} from "./backend/middleware/security.js";
import { setupSocketEvents } from "./backend/events/socketEvents.js";
import { normalizeContact, formatResponse } from "./backend/utils/helpers.js";
import { filterAllowedProjects, isAllowedPublicProject } from "./backend/utils/projectAllowlist.js";
import {
  assertCanCreateProject,
  assertCanAddTeamMember,
  getUserPlan,
  assertProFeature,
} from "./backend/utils/subscription.js";

import User from "./backend/models/User.js";
import Profile from "./backend/models/Profile.js";
import Project from "./backend/models/Project.js";
import Message from "./backend/models/Message.js";
import Activity from "./backend/models/Activity.js";
import Invite from "./backend/models/Invite.js";
import Notification from "./backend/models/Notification.js";
import Post from "./backend/models/Post.js";
import Like from "./backend/models/Like.js";
import Comment from "./backend/models/Comment.js";
import Course from "./backend/models/Course.js";
import CourseEnrollment from "./backend/models/CourseEnrollment.js";
import { saveOtpRecord, verifyOtpRecord } from "./lib/otpStore.js";
import { sendOtpEmail, isEmailOtpConfigured } from "./lib/emailOtp.js";
import { upsertVerifiedUser, findUserByContact, loginExistingUserAfterOtp } from "./lib/userUpsert.js";
import {
  streamCofounderReply,
  computeContextUsage,
  buildSystemPrompt as buildCofounderSystemPrompt,
  normalizeHistory,
  isAnthropicConfigured,
  isGroqConfigured,
  CONTEXT_WINDOW,
} from "./backend/ai/cofounder.js";

const PORT = process.env.PORT || 5001;

function toClient(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  return {
    ...obj,
    id: obj._id?.toString?.() || obj.id,
    _id: undefined,
  };
}

async function notificationUserIdForQuery(userIdParam, authContact, jwtUserId) {
  if (jwtUserId) return jwtUserId;
  if (normalizeContact(userIdParam) === authContact) {
    const user = await User.findOne({ contact: authContact });
    return user?._id?.toString() || null;
  }
  return userIdParam;
}

async function userIdForContact(contact) {
  if (!contact) return null;
  const user = await User.findOne({ contact: normalizeContact(contact) });
  return user?._id?.toString() || null;
}

async function pushNotification({
  contact,
  userId,
  projectId,
  type,
  title,
  message,
  actionUrl,
  metadata,
}) {
  try {
    const uid = userId || (contact ? await userIdForContact(contact) : null);
    if (!uid) return null;
    const notification = await Notification.create({
      userId: uid,
      projectId: projectId || undefined,
      type,
      title,
      message,
      actionUrl: actionUrl || "",
      metadata: metadata || undefined,
    });
    const payload = toClient(notification);
    payload.read = Boolean(notification.isRead);
    io.emit("notification_received", payload);
    return notification;
  } catch (err) {
    console.error("pushNotification:", err.message);
    return null;
  }
}

async function getTeammateContacts(projectId, excludeContact) {
  const project = await Project.findById(projectId).lean();
  if (!project) return [];
  const contacts = new Set();
  if (project.ownerContact) contacts.add(normalizeContact(project.ownerContact));
  for (const m of project.teamMembers || []) {
    if (m.status === "joined" && m.contact) {
      contacts.add(normalizeContact(m.contact));
    }
  }
  if (excludeContact) contacts.delete(normalizeContact(excludeContact));
  return [...contacts];
}

async function getNetworkContacts(userContact) {
  const c = normalizeContact(userContact);
  if (!c) return [];
  const projects = await Project.find({
    $or: [
      { ownerContact: c },
      { teamMembers: { $elemMatch: { contact: c, status: "joined" } } },
    ],
  }).lean();
  const contacts = new Set();
  for (const p of projects) {
    if (p.ownerContact) contacts.add(normalizeContact(p.ownerContact));
    for (const m of p.teamMembers || []) {
      if (m.status === "joined" && m.contact) {
        contacts.add(normalizeContact(m.contact));
      }
    }
  }
  contacts.delete(c);
  return [...contacts];
}

async function notifyManyContacts(contacts, payloadFactory) {
  const seen = new Set();
  for (const contact of contacts) {
    const key = normalizeContact(contact);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const payload = typeof payloadFactory === "function" ? payloadFactory(key) : payloadFactory;
    if (payload) await pushNotification({ contact: key, ...payload });
  }
}

async function displayNameForContact(contact) {
  const user = await User.findOne({ contact: normalizeContact(contact) }).lean();
  return user?.name || contact;
}

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: socketCorsOptions,
  transports: ["websocket", "polling"],
});

app.use(corsMiddleware);
app.use(express.json({ limit: "2mb" }));

// ==================== OTP STORE ====================

function generateOTPCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isPhoneNumber(contact) {
  return /^[\d\s\+\-\(\)]{7,15}$/.test(contact.replace(/\s/g, ""));
}

async function sendEmailOTP(to, code) {
  if (!isEmailOtpConfigured()) return false;
  const result = await sendOtpEmail(to, code);
  return result.ok;
}

async function sendSMSOTP(phone, code) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) return false;
  try {
    const cleanPhone = phone.replace(/[^\d]/g, "").slice(-10);
    const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&route=otp&variables_values=${code}&flash=0&numbers=${cleanPhone}`;
    const res = await fetch(url, { headers: { "cache-control": "no-cache" } });
    const data = await res.json();
    return data.return === true;
  } catch (err) {
    console.error("SMS OTP error:", err.message);
    return false;
  }
}

// POST /api/auth/send-otp
function isValidEmail(contact) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(contact).trim());
}

function isValidPhone(contact) {
  const digits = String(contact).replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { contact, purpose: rawPurpose } = req.body;
    if (!contact?.trim()) {
      return res.status(400).json(formatResponse(false, null, "Enter your email or phone number"));
    }
    const trimmed = contact.trim();
    const contactErr = validateContact(trimmed);
    if (contactErr) {
      return res.status(400).json(formatResponse(false, null, contactErr));
    }

    const purpose = rawPurpose === "signup" ? "signup" : "signin";
    const normalized = normalizeContact(trimmed);
    const existing = await findUserByContact(normalized);

    if (purpose === "signin" && !existing) {
      return res
        .status(404)
        .json(formatResponse(false, null, "Account not found — sign up first"));
    }
    if (purpose === "signup" && existing) {
      return res
        .status(409)
        .json(formatResponse(false, null, "Account already exists — sign in instead"));
    }

    const code = generateOTPCode();
    await saveOtpRecord(trimmed, code);

    res.json(
      formatResponse(true, {
        sent: false,
        devCode: code,
        message: "Enter the verification code shown below",
      })
    );
  } catch (error) {
    console.error("send-otp error:", error.message);
    res.status(500).json(formatResponse(false, null, "Could not send OTP — try again"));
  }
});

// POST /api/auth/verify-otp
app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { contact, code, purpose: rawPurpose } = req.body;
    const contactErr = validateContact(contact);
    if (contactErr) {
      return res.status(400).json(formatResponse(false, null, contactErr));
    }
    const codeErr = validateOtpCode(code);
    if (codeErr) {
      return res.status(400).json(formatResponse(false, null, codeErr));
    }

    const purpose = rawPurpose === "signup" ? "signup" : "signin";

    const result = await verifyOtpRecord(contact, code);
    if (!result.ok) {
      return res.status(400).json(formatResponse(false, null, result.error || "Incorrect OTP code"));
    }

    const normalized = normalizeContact(contact);

    if (purpose === "signin") {
      const login = await loginExistingUserAfterOtp(normalized);
      if (!login.ok) {
        return res
          .status(login.status || 404)
          .json(formatResponse(false, null, login.error || "Account not found — sign up first"));
      }
      return res.json(
        formatResponse(true, {
          verified: true,
          token: login.data.token,
          user: login.data.user,
        })
      );
    }

    const existing = await findUserByContact(normalized);
    if (existing) {
      return res
        .status(409)
        .json(formatResponse(false, null, "Account already exists — sign in instead"));
    }

    return res.json(formatResponse(true, { verified: true }));
  } catch (error) {
    console.error("verify-otp error:", error.message);
    res.status(500).json(formatResponse(false, null, "OTP verification failed — check the code and try again"));
  }
});

// ==================== HEALTH ====================

app.get("/api/health", (req, res) => {
  res.json(
    formatResponse(true, {
      status: "ok",
      database:
        mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      websocket: "ready",
      time: new Date().toISOString(),
    })
  );
});

// ==================== USERS ====================

app.post("/api/users/upsert", async (req, res) => {
  try {
    const result = await upsertVerifiedUser(req.body, { requireVerified: true });
    if (!result.ok) {
      return res.status(result.status || 400).json(formatResponse(false, null, result.error));
    }
    res.json(formatResponse(true, result.data));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// Update user lastActive + city from auth hook on every sign-in
app.patch("/api/users/:contact/active", authMiddleware, async (req, res) => {
  try {
    const contact = normalizeContact(req.params.contact);
    if (!assertSameContact(req, res, contact)) return;
    await User.updateOne({ contact }, { $set: { lastActive: new Date() } });
    res.json(formatResponse(true, { ok: true }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

app.get("/api/users/:contact", async (req, res) => {
  try {
    const contact = normalizeContact(req.params.contact);
    const user = await User.findOne({ contact });
    if (!user) {
      return res.status(404).json(formatResponse(false, null, "User not found"));
    }
    res.json(formatResponse(true, { user: { ...toClient(user), isLoggedIn: true } }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

app.get("/api/users/:userId/notifications", authMiddleware, async (req, res) => {
  try {
    const authContact = requireAuthContact(req, res);
    if (!authContact) return;
    const userId = req.params.userId;
    if (normalizeContact(userId) !== authContact && userId !== req.user?.userId) {
      return res.status(403).json(formatResponse(false, null, "You can only read your own notifications"));
    }
    const queryUserId = await notificationUserIdForQuery(userId, authContact, req.user?.userId);
    if (!queryUserId) {
      return res.json(formatResponse(true, { notifications: [] }));
    }
    const notifications = await Notification.find({ userId: queryUserId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(formatResponse(true, { notifications: notifications.map(toClient) }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// ==================== PROFILES ====================

app.post("/api/profile/upsert", authMiddleware, async (req, res) => {
  try {
    const {
      contact,
      role = "member",
      tagline = "",
      categoryIds = [],
      skills = [],
      rateMin,
      rateMax,
      currency = "USD",
      availableForInvites = false,
      bio = "",
      portfolio = "",
      profileImage,
    } = req.body;

    const contactErr = validateContact(contact);
    if (contactErr) {
      return res.status(400).json(formatResponse(false, null, contactErr));
    }

    const normalized = normalizeContact(contact);
    if (!assertSameContact(req, res, normalized)) return;

    if (profileImage && String(profileImage).length > 1_200_000) {
      return res.status(400).json(formatResponse(false, null, "Profile image too large (max ~1MB)"));
    }

    const update = {
      contact: normalized,
      role: clampString(role, 32) || "member",
      tagline: clampString(tagline, 200),
      categoryIds: clampStringArray(categoryIds, 10, 64),
      skills: clampStringArray(skills),
      rateMin: rateMin ?? null,
      rateMax: rateMax ?? null,
      currency: clampString(currency, 8) || "INR",
      availableForInvites: Boolean(availableForInvites),
      bio: clampString(bio, 2000),
      portfolio: clampString(portfolio, 1000),
    };
    if (profileImage !== undefined) {
      update.profileImage = profileImage || "";
    }

    const profile = await Profile.findOneAndUpdate(
      { contact: normalized },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json(formatResponse(true, { profile: toClient(profile) }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

app.get("/api/profile/:contact", async (req, res) => {
  try {
    const contact = normalizeContact(req.params.contact);
    const profile = await Profile.findOne({ contact });
    if (!profile) {
      return res.json(formatResponse(true, { profile: null }));
    }
    res.json(formatResponse(true, { profile: toClient(profile) }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

app.post("/api/profile/rate", authMiddleware, async (req, res) => {
  try {
    const { contact, stars } = req.body;
    const rater = requireAuthContact(req, res);
    if (!rater) return;
    const target = normalizeContact(contact);
    if (!target) {
      return res.status(400).json(formatResponse(false, null, "Enter a valid contact to rate"));
    }
    if (target === rater) {
      return res.status(400).json(formatResponse(false, null, "You cannot rate yourself"));
    }
    const n = Number(stars);
    if (!Number.isFinite(n) || n < 1 || n > 5) {
      return res.status(400).json(formatResponse(false, null, "Rating must be between 1 and 5 stars"));
    }

    let profile = await Profile.findOne({ contact: target });
    if (!profile) {
      profile = await Profile.create({ contact: target, role: "member" });
    }

    const count = profile.workRatingCount || 0;
    const avg = profile.workRatingAvg || 0;
    const nextCount = count + 1;
    const nextAvg = (avg * count + n) / nextCount;
    profile.workRatingAvg = Math.round(nextAvg * 10) / 10;
    profile.workRatingCount = nextCount;
    await profile.save();

    const raterName = await displayNameForContact(rater);
    await pushNotification({
      contact: target,
      type: "activity",
      title: "New rating on your profile",
      message: `${raterName} rated you ${n} star${n === 1 ? "" : "s"}`,
      actionUrl: `/u/${encodeURIComponent(target)}`,
      metadata: { rater, stars: n },
    });

    res.json(
      formatResponse(true, {
        profile: toClient(profile),
        message: "Rating saved",
      })
    );
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

function parsePortfolioLinks(raw) {
  if (!raw || !String(raw).trim()) return [];
  return String(raw)
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function computeProfileBadges({ user, profile, owned, joined, tasksDone }) {
  const badges = [];
  const push = (id, label, icon, description) => badges.push({ id, label, icon, description });

  if (user) push("member", "Make Big Member", "🎓", "Verified platform member");

  if (profile?.profileImage && profile?.bio && profile?.tagline) {
    push("complete-profile", "Complete Profile", "✨", "Photo, headline, and about filled in");
  }

  if ((profile?.skills || user?.skills || []).length >= 3) {
    push("skilled", "Multi-skilled", "⚡", "Three or more skills listed");
  }

  if (owned.length >= 1) {
    push("founder", "Project Founder", "🚀", "Created at least one project");
  }
  if (owned.length >= 2) {
    push("serial-builder", "Serial Builder", "🏗️", "Leading multiple projects");
  }

  if (joined.length >= 1) {
    push("team-player", "Team Player", "🤝", "Joined projects as a teammate");
  }

  const published = [...owned, ...joined].filter((p) =>
    ["published", "in-progress", "completed"].includes(p.status)
  ).length;
  if (published >= 1) {
    push("shipper", "Shipper", "📦", "Active on a published project");
  }

  if (tasksDone >= 5) {
    push("task-master", "Task Master", "✅", "Five or more tasks completed across projects");
  }

  if (profile?.availableForInvites) {
    push("open", "Open to Collaborate", "🟢", "Available for team invites");
  }

  if (user?.plan === "pro") {
    push("pro", "Pro Member", "💎", "Make Big Pro subscriber");
  }

  if (user?.college) {
    push("campus", "Campus Creator", "🏫", `Connected to ${user.college}`);
  }

  return badges;
}

// Full public profile — mini LinkedIn card (projects, badges, portfolio)
app.get("/api/users/:contact/public-profile", async (req, res) => {
  try {
    const contact = normalizeContact(req.params.contact);
    if (!contact) {
      return res.status(400).json(formatResponse(false, null, "contact required"));
    }

    const user = await User.findOne({ contact }).lean();
    if (!user) {
      return res.status(404).json(formatResponse(false, null, "User not found"));
    }

    const profileDoc = await Profile.findOne({ contact }).lean();
    const owned = await Project.find({ ownerContact: contact }).sort({ updatedAt: -1 }).limit(15).lean();
    const joinedProjects = await Project.find({
      ownerContact: { $ne: contact },
      teamMembers: { $elemMatch: { contact, status: "joined" } },
    })
      .sort({ updatedAt: -1 })
      .limit(15)
      .lean();

    const ownedAllowed = filterAllowedProjects(owned);
    const joinedAllowed = filterAllowedProjects(joinedProjects);
    let tasksDone = 0;
    for (const p of [...ownedAllowed, ...joinedAllowed]) {
      tasksDone += (p.tasks || []).filter((t) =>
        ["done", "completed"].includes(t.status)
      ).length;
    }

    const seen = new Set();
    const projects = [];
    for (const p of ownedAllowed) {
      const id = p._id.toString();
      if (seen.has(id)) continue;
      seen.add(id);
      projects.push({
        id,
        name: p.name,
        desc: p.desc,
        categoryId: p.categoryId,
        slug: p.slug || "",
        status: p.status,
        relation: "owner",
        roles: p.roles || [],
        city: p.city || "",
        updatedAt: p.updatedAt,
      });
    }
    for (const p of joinedAllowed) {
      const id = p._id.toString();
      if (seen.has(id)) continue;
      seen.add(id);
      projects.push({
        id,
        name: p.name,
        desc: p.desc,
        categoryId: p.categoryId,
        slug: p.slug || "",
        status: p.status,
        relation: "member",
        roles: p.roles || [],
        city: p.city || "",
        updatedAt: p.updatedAt,
      });
    }

    const profile = profileDoc
      ? {
          tagline: profileDoc.tagline || "",
          bio: profileDoc.bio || "",
          profileImage: profileDoc.profileImage || "",
          portfolio: profileDoc.portfolio || "",
          portfolioLinks: parsePortfolioLinks(profileDoc.portfolio),
          role: profileDoc.role,
          categoryIds: profileDoc.categoryIds || [],
          skills: profileDoc.skills || [],
          availableForInvites: profileDoc.availableForInvites,
          rateMin: profileDoc.rateMin,
          rateMax: profileDoc.rateMax,
          currency: profileDoc.currency || "INR",
          workRatingAvg: profileDoc.workRatingAvg || 0,
          workRatingCount: profileDoc.workRatingCount || 0,
        }
      : null;

    const badges = computeProfileBadges({
      user,
      profile: profileDoc,
      owned: ownedAllowed,
      joined: joinedAllowed,
      tasksDone,
    });

    res.json(
      formatResponse(true, {
        user: {
          name: user.name,
          contact: user.contact,
          college: user.college || "",
          graduationYear: user.graduationYear || "",
          city: user.city || "",
          state: user.state || "",
          skills: user.skills || [],
          hobbies: user.hobbies || [],
          plan: user.plan || "free",
        },
        profile,
        projects,
        badges,
        stats: {
          projectsLed: owned.length,
          projectsJoined: joinedProjects.length,
          tasksCompleted: tasksDone,
        },
      })
    );
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

app.get("/api/talent", async (req, res) => {
  try {
    const { search } = req.query;
    let users;
    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(escapeRegex(q), "i");
      users = await User.find({
        $or: [{ name: regex }, { contact: regex }, { skills: regex }, { college: regex }],
      })
        .sort({ createdAt: -1 })
        .limit(40)
        .lean();
    } else {
      users = await User.find({}).sort({ createdAt: -1 }).limit(50).lean();
    }

    const contacts = users.map((u) => u.contact).filter(Boolean);
    const profiles = await Profile.find({ contact: { $in: contacts } }).lean();
    const profileByContact = Object.fromEntries(profiles.map((p) => [p.contact, p]));

    const talent = users.map((u) => {
      const p = profileByContact[u.contact];
      return {
        id: u._id?.toString(),
        name: u.name,
        contact: u.contact,
        skills: u.skills || p?.skills || [],
        college: u.college || "",
        tagline: p?.tagline || "",
        role: p?.role || "member",
        availableForInvites: Boolean(p?.availableForInvites),
        workRatingAvg: p?.workRatingAvg || 0,
        workRatingCount: p?.workRatingCount || 0,
      };
    });

    res.json(formatResponse(true, { users: talent, talent }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// ==================== SLUG HELPER ====================

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function generateUniqueSlug(name, city) {
  const base = slugify([name, city].filter(Boolean).join(" "));
  let slug = base;
  let suffix = 0;
  while (await Project.exists({ slug })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

// ==================== PROJECTS ====================

app.post("/api/projects/create", authMiddleware, async (req, res) => {
  try {
    const {
      name,
      desc,
      description,
      categoryId,
      roles = [],
      salaryMin,
      salaryMax,
      currency = "INR",
      ownerContact,
      teamSize,
      deadline,
      vision,
      city,
      state,
      projectPurpose,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json(formatResponse(false, null, "Project name is required"));
    }
    if (!categoryId) {
      return res.status(400).json(formatResponse(false, null, "Please select a project category"));
    }

    const owner = requireAuthContact(req, res);
    if (!owner) return;

    await assertCanCreateProject(owner);

    const slug = await generateUniqueSlug(name, city);
    const purpose = ["employment", "college", "creative", "community"].includes(projectPurpose)
      ? projectPurpose
      : "college";
    const paidRole = purpose === "employment";

    const project = await Project.create({
      name: String(name).trim(),
      desc: (desc || description || "").trim(),
      categoryId,
      projectPurpose: purpose,
      roles: Array.isArray(roles) ? roles : [],
      salaryMin: paidRole ? salaryMin : 0,
      salaryMax: paidRole ? salaryMax : 0,
      currency: paidRole ? currency : "INR",
      ownerContact: owner,
      status: "draft",
      maxTeamSize: teamSize || 10,
      city: city || "",
      state: state || "",
      slug,
    });

    await Activity.create({
      projectId: project._id,
      userId: owner || req.user?.userId || "system",
      type: "project_created",
      description: `Project "${project.name}" was created`,
      metadata: { deadline, vision },
    });

    io.emit("project_created", toClient(project));
    res.json(formatResponse(true, { project: toClient(project) }));
  } catch (error) {
    if (error.code === "PLAN_LIMIT") {
      return res.status(403).json({ success: false, error: error.message, code: "PLAN_LIMIT" });
    }
    const msg =
      error.name === "ValidationError"
        ? "Project creation failed — check all fields and try again"
        : error.message || "Project creation failed";
    res.status(500).json(formatResponse(false, null, msg));
  }
});

app.get("/api/projects", authMiddleware, async (req, res) => {
  try {
    const authContact = requireAuthContact(req, res);
    if (!authContact) return;
    const { status, ownerContact, categoryId } = req.query;
    const filter = { ownerContact: authContact };
    if (status) filter.status = status;
    if (ownerContact && normalizeContact(ownerContact) !== authContact) {
      return res.status(403).json(formatResponse(false, null, "You can only list your own projects"));
    }
    if (categoryId) filter.categoryId = categoryId;

    const projects = await Project.find(filter).sort({ updatedAt: -1 }).limit(100);
    res.json(formatResponse(true, { projects: filterAllowedProjects(projects.map(toClient)) }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// Browse published projects (for "Join" flow — Person 2 discovers Person 1's projects)
app.get("/api/projects/browse", async (req, res) => {
  try {
    const { categoryId, excludeContact } = req.query;
    const filter = {
      status: { $in: ["published", "in-progress"] },
      visibility: { $in: ["public", "invite-only"] },
    };

    if (categoryId && categoryId !== "all") {
      filter.categoryId = String(categoryId);
    }

    if (excludeContact) {
      filter.ownerContact = { $ne: normalizeContact(excludeContact) };
    }

    const projects = await Project.find(filter).sort({ updatedAt: -1 }).limit(50);

    const enriched = filterAllowedProjects(projects.map((p) => {
      const obj = toClient(p);
      const joinedCount = (p.teamMembers || []).filter(
        (m) => m.status === "joined"
      ).length;
      return {
        ...obj,
        joinedCount,
        teamMemberCount: (p.teamMembers || []).length,
      };
    }));

    res.json(formatResponse(true, { projects: enriched }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// Person 2 joins Person 1's project
app.post("/api/projects/:projectId/join", authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const memberContact = requireAuthContact(req, res);
    if (!memberContact) return;
    const memberName = String(req.body.memberName || memberContact).trim();
    const role = String(req.body.role || "member").trim();

    if (!memberContact) {
      return res.status(400).json(formatResponse(false, null, "memberContact required"));
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json(formatResponse(false, null, "Project not found"));
    }

    if (!["published", "in-progress"].includes(project.status)) {
      return res
        .status(400)
        .json(formatResponse(false, null, "Project is not open for joining"));
    }

    if (normalizeContact(project.ownerContact) === memberContact) {
      return res
        .status(400)
        .json(formatResponse(false, null, "You cannot join your own project"));
    }

    const alreadyMember = (project.teamMembers || []).some(
      (m) => normalizeContact(m.contact) === memberContact && m.status === "joined"
    );
    if (alreadyMember) {
      return res
        .status(400)
        .json(formatResponse(false, null, "You already joined this project"));
    }

    const alreadyPending = (project.teamMembers || []).some(
      (m) => normalizeContact(m.contact) === memberContact && m.status === "pending"
    );
    if (alreadyPending) {
      return res.json(
        formatResponse(true, {
          project: toClient(project),
          message: "Join request already sent — waiting for creator approval",
          pending: true,
          joined: false,
        })
      );
    }

    const existingRow = (project.teamMembers || []).find(
      (m) => normalizeContact(m.contact) === memberContact
    );
    if (existingRow) {
      existingRow.status = "pending";
      existingRow.role = role;
      existingRow.joinedAt = undefined;
    } else {
      project.teamMembers.push({
        contact: memberContact,
        role,
        status: "pending",
      });
    }
    await project.save();

    const memberDisplayName =
      memberName !== memberContact ? memberName : await displayNameForContact(memberContact);

    const owner = await User.findOne({ contact: normalizeContact(project.ownerContact) });
    if (owner) {
      await pushNotification({
        userId: owner._id.toString(),
        projectId: project._id,
        type: "join_request",
        title: "Join request",
        message: `${memberDisplayName} asked to join "${project.name}"`,
        actionUrl: `/projects/${project._id}`,
        metadata: { memberContact, projectId: project._id.toString(), status: "pending" },
      });
    }

    res.json(
      formatResponse(true, {
        project: toClient(project),
        message: "Join request sent — the project creator will review it",
        pending: true,
        joined: false,
      })
    );
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// Owner lists inbound join requests (status pending on teamMembers)
app.get("/api/projects/:projectId/join-requests", authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json(formatResponse(false, null, "Project not found"));
    if (!assertProjectOwner(req, res, project)) return;

    const pending = (project.teamMembers || [])
      .filter((m) => m.status === "pending")
      .map((m) => ({
        contact: m.contact,
        role: m.role || "member",
        requestedAt: m.joinedAt || project.updatedAt,
      }));

    res.json(formatResponse(true, { requests: pending }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

async function finalizeJoinMember(project, memberContact, memberName, role) {
  const row = (project.teamMembers || []).find(
    (m) => normalizeContact(m.contact) === memberContact
  );
  if (!row) {
    project.teamMembers.push({
      contact: memberContact,
      role: role || "member",
      status: "joined",
      joinedAt: new Date(),
    });
  } else {
    row.status = "joined";
    row.role = role || row.role || "member";
    row.joinedAt = new Date();
  }
  await project.save();

  const joinActivity = await Activity.create({
    projectId: project._id,
    userId: memberContact,
    type: "member_joined",
    description: `${memberName} joined the project`,
  });
  io.to(`project_${project._id}`).emit("activity_created", toClient(joinActivity));

  io.to(`project_${project._id}`).emit("member_status_changed", {
    projectId: project._id.toString(),
    memberContact,
    memberName,
    status: "joined",
  });
}

app.post("/api/projects/:projectId/join-requests/:contact/approve", authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json(formatResponse(false, null, "Project not found"));
    if (!assertProjectOwner(req, res, project)) return;

    const memberContact = normalizeContact(req.params.contact);
    const pending = (project.teamMembers || []).find(
      (m) => normalizeContact(m.contact) === memberContact && m.status === "pending"
    );
    if (!pending) {
      return res.status(404).json(formatResponse(false, null, "No pending join request for this person"));
    }

    await assertCanAddTeamMember(project);
    const maxSize = project.maxTeamSize || 10;
    const currentJoined = (project.teamMembers || []).filter((m) => m.status === "joined").length;
    if (currentJoined >= maxSize) {
      return res.status(400).json(formatResponse(false, null, "Project team is full"));
    }

    const memberName = await displayNameForContact(memberContact);
    await finalizeJoinMember(project, memberContact, memberName, pending.role);

    const memberUser = await User.findOne({ contact: memberContact });
    if (memberUser) {
      await pushNotification({
        userId: memberUser._id.toString(),
        projectId: project._id,
        type: "join",
        title: "Join request approved",
        message: `You were approved to join "${project.name}"`,
        actionUrl: `/projects/${project._id}`,
        metadata: { projectId: project._id.toString() },
      });
    }

    res.json(formatResponse(true, { project: toClient(project), message: "Member approved" }));
  } catch (error) {
    if (error.code === "PLAN_LIMIT") {
      return res.status(403).json({ success: false, error: error.message, code: "PLAN_LIMIT" });
    }
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

app.post("/api/projects/:projectId/join-requests/:contact/decline", authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json(formatResponse(false, null, "Project not found"));
    if (!assertProjectOwner(req, res, project)) return;

    const memberContact = normalizeContact(req.params.contact);
    const idx = (project.teamMembers || []).findIndex(
      (m) => normalizeContact(m.contact) === memberContact && m.status === "pending"
    );
    if (idx === -1) {
      return res.status(404).json(formatResponse(false, null, "No pending join request for this person"));
    }

    project.teamMembers.splice(idx, 1);
    await project.save();

    const memberUser = await User.findOne({ contact: memberContact });
    if (memberUser) {
      await pushNotification({
        userId: memberUser._id.toString(),
        projectId: project._id,
        type: "join",
        title: "Join request declined",
        message: `Your request to join "${project.name}" was declined`,
        actionUrl: `/explore`,
        metadata: { projectId: project._id.toString() },
      });
    }

    res.json(formatResponse(true, { message: "Join request declined" }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// Top paying projects for homepage salary leaderboard (must be BEFORE /:projectId)
app.get("/api/projects/top-salaries", async (req, res) => {
  try {
    const projects = await Project.find({
      status: { $in: ["published", "in-progress"] },
      projectPurpose: "employment",
      salaryMax: { $gt: 0 },
    })
      .sort({ salaryMax: -1 })
      .limit(8)
      .lean();
    res.json(
      formatResponse(true, {
        projects: projects.map((p) => ({
          id: p._id?.toString(),
          name: p.name,
          categoryId: p.categoryId,
          salaryMin: p.salaryMin,
          salaryMax: p.salaryMax,
          currency: p.currency || "INR",
          roles: p.roles || [],
        })),
      })
    );
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

app.get("/api/projects/:projectId", authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json(formatResponse(false, null, "Project not found"));
    }
    if (!assertProjectAccess(req, res, project)) return;

    const [activities, messages] = await Promise.all([
      Activity.find({ projectId: project._id }).sort({ createdAt: -1 }).limit(50),
      Message.find({ projectId: project._id }).sort({ createdAt: -1 }).limit(100),
    ]);

    res.json(
      formatResponse(true, {
        project: toClient(project),
        activities: activities.map(toClient),
        messages: messages.map(toClient),
        teamMemberCount: project.teamMembers?.length || 0,
      })
    );
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

app.put("/api/projects/:projectId", authMiddleware, async (req, res) => {
  try {
    const existing = await Project.findById(req.params.projectId);
    if (!existing) {
      return res.status(404).json(formatResponse(false, null, "Project not found"));
    }
    if (!assertProjectOwner(req, res, existing)) return;

    const updates = sanitizeProjectUpdate(req.body);
    const project = await Project.findByIdAndUpdate(
      req.params.projectId,
      updates,
      { new: true }
    );

    io.to(`project_${project._id}`).emit("project_changed", {
      projectId: project._id.toString(),
      updatedFields: updates,
    });

    res.json(formatResponse(true, { project: toClient(project) }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

app.post("/api/projects/:projectId/publish", authMiddleware, async (req, res) => {
  try {
    const existing = await Project.findById(req.params.projectId);
    if (!existing) {
      return res.status(404).json(formatResponse(false, null, "Project not found"));
    }
    if (!assertProjectOwner(req, res, existing)) return;

    const project = await Project.findByIdAndUpdate(
      req.params.projectId,
      { status: "published" },
      { new: true }
    );

    if (!project.slug) {
      project.slug = await generateUniqueSlug(project.name, project.city);
      await project.save();
    }

    await Activity.create({
      projectId: project._id,
      userId: req.user?.userId || project.ownerContact,
      type: "project_updated",
      description: `Project "${project.name}" was published`,
    });

    io.emit("project_published", toClient(project));
    io.to(`project_${project._id}`).emit("project_changed", {
      projectId: project._id.toString(),
      status: "published",
    });

    // Auto-generate first post when project is published
    const hasPost = await Post.exists({ projectId: project._id });
    if (!hasPost) {
      const locationPart = project.city ? ` Based in ${project.city}, ${project.state || ''}.`.trim() : "";
      const rolesPart = (project.roles || []).length
        ? ` Looking for: ${project.roles.slice(0, 3).join(", ")}.`
        : "";
      await Post.create({
        projectId: project._id,
        authorId: project.ownerContact || "system",
        body: `🚀 ${project.name} is now live on Make Big!${locationPart} ${project.desc || ""}${rolesPart} Join us and let's build something big together!`,
      });
    }

    res.json(formatResponse(true, { project: toClient(project) }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

app.get("/api/projects/:projectId/members", async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).lean();
    if (!project) {
      return res.status(404).json(formatResponse(false, null, "Project not found"));
    }

    const members = (project.teamMembers || [])
      .filter((m) => m.status === "joined")
      .map((m) => ({
        contact: m.contact,
        role: m.role || "member",
        status: "active",
        joinedAt: m.joinedAt,
      }));

    // Include the owner as the first member.
    const ownerEntry = {
      contact: project.ownerContact,
      role: "owner",
      status: "active",
      joinedAt: project.createdAt,
    };

    res.json(formatResponse(true, { members: [ownerEntry, ...members] }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// ==================== TASKS ====================

app.get("/api/projects/:projectId/tasks", authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json(formatResponse(false, null, "Project not found"));
    if (!assertProjectMember(req, res, project)) return;
    const lean = project.toObject();
    res.json(formatResponse(true, { tasks: (lean.tasks || []).map(t => ({ ...t, id: t._id?.toString() })) }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

app.post("/api/projects/:projectId/tasks", authMiddleware, async (req, res) => {
  try {
    const { title, description, priority, assignee } = req.body;
    if (!title?.trim()) return res.status(400).json(formatResponse(false, null, "title required"));

    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json(formatResponse(false, null, "Project not found"));

    const task = { title: title.trim(), description: description || '', priority: priority || 'medium', assignee: assignee || '', status: 'todo', createdBy: req.user?.contact || '', createdAt: new Date() };
    project.tasks.push(task);
    await project.save();

    const saved = project.tasks[project.tasks.length - 1];
    const taskObj = { ...saved.toObject(), id: saved._id.toString() };

    const activity = await Activity.create({ projectId: project._id, userId: req.user?.contact || '', type: 'task_created', description: `Task "${title}" was created` });

    io.to(`project_${project._id}`).emit("task_created", { projectId: project._id.toString(), task: taskObj });
    io.to(`project_${project._id}`).emit("activity_created", toClient(activity));
    res.json(formatResponse(true, { task: taskObj }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

app.put("/api/projects/:projectId/tasks/:taskId", authMiddleware, async (req, res) => {
  try {
    const { status, priority, assignee, title, description } = req.body;
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json(formatResponse(false, null, "Project not found"));

    const task = project.tasks.id(req.params.taskId);
    if (!task) return res.status(404).json(formatResponse(false, null, "Task not found"));

    const oldStatus = task.status;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (assignee !== undefined) task.assignee = assignee;
    await project.save();

    const taskObj = { ...task.toObject(), id: task._id.toString() };

    if (status && status !== oldStatus) {
      const activity = await Activity.create({ projectId: project._id, userId: req.user?.contact || '', type: 'task_updated', description: `Task "${task.title}" moved to ${status}` });
      io.to(`project_${project._id}`).emit("activity_created", toClient(activity));
    }

    io.to(`project_${project._id}`).emit("task_updated", { projectId: project._id.toString(), task: taskObj });
    res.json(formatResponse(true, { task: taskObj }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

app.delete("/api/projects/:projectId/tasks/:taskId", authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json(formatResponse(false, null, "Project not found"));

    const task = project.tasks.id(req.params.taskId);
    if (!task) return res.status(404).json(formatResponse(false, null, "Task not found"));

    const title = task.title;
    task.deleteOne();
    await project.save();

    io.to(`project_${project._id}`).emit("task_deleted", { projectId: project._id.toString(), taskId: req.params.taskId });
    const activity = await Activity.create({ projectId: project._id, userId: req.user?.contact || '', type: 'task_deleted', description: `Task "${title}" was deleted` });
    io.to(`project_${project._id}`).emit("activity_created", toClient(activity));
    res.json(formatResponse(true, { deleted: true }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// ==================== NOTIFICATIONS ====================

app.patch("/api/users/:userId/notifications/read", authMiddleware, async (req, res) => {
  try {
    const authContact = requireAuthContact(req, res);
    if (!authContact) return;
    const userId = req.params.userId;
    if (normalizeContact(userId) !== authContact && userId !== req.user?.userId) {
      return res.status(403).json(formatResponse(false, null, "You can only update your own notifications"));
    }
    const queryUserId = await notificationUserIdForQuery(userId, authContact, req.user?.userId);
    if (queryUserId) {
      await Notification.updateMany(
        { userId: queryUserId, isRead: false },
        { $set: { isRead: true } }
      );
    }
    res.json(formatResponse(true, { marked: true }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

app.get("/api/projects/:projectId/activities", async (req, res) => {
  try {
    const activities = await Activity.find({
      projectId: req.params.projectId,
    })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(formatResponse(true, { activities: activities.map(toClient) }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

app.get("/api/projects/:projectId/messages", authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json(formatResponse(false, null, "Project not found"));
    if (!assertProjectMember(req, res, project)) return;
    const messages = await Message.find({
      projectId: req.params.projectId,
    })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(formatResponse(true, { messages: messages.map(toClient) }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// ==================== FEED & EXPLORE & PUBLIC PAGES ====================

// Public feed — paginated, newest first, no auth required
app.get("/api/feed", async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const enriched = await Promise.all(
      posts.map(async (post) => {
        const project = await Project.findById(post.projectId).lean();
        const likeCount = await Like.countDocuments({ postId: post._id });
        const commentCount = await Comment.countDocuments({ postId: post._id });
        return {
          id: post._id.toString(),
          projectId: post.projectId?.toString(),
          projectName: project?.name || "",
          projectSlug: project?.slug || "",
          projectCategory: project?.categoryId || "",
          projectCity: project?.city || "",
          projectState: project?.state || "",
          authorId: post.authorId,
          body: post.body,
          imageUrl: post.imageUrl || "",
          likeCount,
          commentCount,
          createdAt: post.createdAt,
        };
      })
    );

    const total = await Post.countDocuments({});
    res.json(formatResponse(true, { posts: enriched, page, limit, total, hasMore: skip + limit < total }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Unified search — projects, people, skills (recommendations when q empty)
app.get("/api/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.min(20, parseInt(req.query.limit, 10) || 12);

    if (!q) {
      const projects = await Project.find({
        status: { $in: ["published", "in-progress"] },
      })
        .sort({ updatedAt: -1 })
        .limit(8)
        .lean();
      const people = await User.find({})
        .sort({ updatedAt: -1 })
        .limit(8)
        .lean();
      return res.json(
        formatResponse(true, {
          recommendations: true,
          projects: filterAllowedProjects(projects).map((p) => ({
            id: p._id.toString(),
            name: p.name,
            desc: p.desc,
            categoryId: p.categoryId,
            roles: p.roles || [],
            city: p.city || "",
            state: p.state || "",
            slug: p.slug || "",
            ownerContact: p.ownerContact,
            joinedCount: (p.teamMembers || []).filter((m) => m.status === "joined").length,
          })),
          people: people.map((u) => ({
            id: u._id?.toString(),
            name: u.name,
            contact: u.contact,
            skills: u.skills || [],
            college: u.college || "",
            hobbies: u.hobbies || [],
          })),
        })
      );
    }

    const regex = new RegExp(escapeRegex(q), "i");
    const projects = await Project.find({
      status: { $in: ["published", "in-progress", "draft"] },
      $or: [
        { name: regex },
        { desc: regex },
        { city: regex },
        { state: regex },
        { categoryId: regex },
        { roles: regex },
      ],
    })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    const people = await User.find({
      $or: [
        { name: regex },
        { contact: regex },
        { skills: regex },
        { hobbies: regex },
        { college: regex },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json(
      formatResponse(true, {
        recommendations: false,
        projects: filterAllowedProjects(projects).map((p) => ({
          id: p._id.toString(),
          name: p.name,
          desc: p.desc,
          categoryId: p.categoryId,
          roles: p.roles || [],
          city: p.city || "",
          state: p.state || "",
          slug: p.slug || "",
          ownerContact: p.ownerContact,
          joinedCount: (p.teamMembers || []).filter((m) => m.status === "joined").length,
        })),
        people: people.map((u) => ({
          id: u._id?.toString(),
          name: u.name,
          contact: u.contact,
          skills: u.skills || [],
          college: u.college || "",
          hobbies: u.hobbies || [],
        })),
      })
    );
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// Full project detail — team + capabilities
app.get("/api/projects/:projectId/detail", async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).lean();
    if (!project) {
      return res.status(404).json(formatResponse(false, null, "Project not found"));
    }

    const joined = (project.teamMembers || []).filter((m) => m.status === "joined");
    const contacts = [
      normalizeContact(project.ownerContact),
      ...joined.map((m) => normalizeContact(m.contact)),
    ].filter(Boolean);

    const users = await User.find({ contact: { $in: contacts } }).lean();
    const userByContact = Object.fromEntries(
      users.map((u) => [normalizeContact(u.contact), u])
    );

    const team = [
      {
        contact: project.ownerContact,
        role: "owner",
        status: "active",
        name: userByContact[normalizeContact(project.ownerContact)]?.name || project.ownerContact?.split("@")[0],
        skills: userByContact[normalizeContact(project.ownerContact)]?.skills || [],
        hobbies: userByContact[normalizeContact(project.ownerContact)]?.hobbies || [],
        college: userByContact[normalizeContact(project.ownerContact)]?.college || "",
        graduationYear: userByContact[normalizeContact(project.ownerContact)]?.graduationYear || "",
      },
      ...joined.map((m) => {
        const c = normalizeContact(m.contact);
        const u = userByContact[c];
        return {
          contact: m.contact,
          role: m.role || "member",
          status: m.status,
          joinedAt: m.joinedAt,
          name: u?.name || m.contact?.split("@")[0] || "Member",
          skills: u?.skills || [],
          hobbies: u?.hobbies || [],
          college: u?.college || "",
          graduationYear: u?.graduationYear || "",
        };
      }),
    ];

    res.json(
      formatResponse(true, {
        project: {
          id: project._id.toString(),
          name: project.name,
          desc: project.desc,
          categoryId: project.categoryId,
          projectPurpose: project.projectPurpose || "college",
          roles: project.roles || [],
          city: project.city || "",
          state: project.state || "",
          slug: project.slug || "",
          status: project.status,
          salaryMin: project.salaryMin,
          salaryMax: project.salaryMax,
          currency: project.currency || "INR",
          ownerContact: project.ownerContact,
          teamSize: joined.length,
        },
        team,
        openRoles: project.roles || [],
      })
    );
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// User workspaces — restore project after re-login
app.get("/api/users/:contact/workspaces", authMiddleware, async (req, res) => {
  try {
    const contact = normalizeContact(req.params.contact);
    if (!contact) {
      return res.status(400).json(formatResponse(false, null, "Enter your email or phone number"));
    }
    if (!assertSameContact(req, res, contact)) return;

    const owned = await Project.find({ ownerContact: contact })
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();

    const joinedProjects = await Project.find({
      ownerContact: { $ne: contact },
      teamMembers: { $elemMatch: { contact, status: "joined" } },
    })
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();

    const seen = new Set();
    const workspaces = [];

    for (const p of owned) {
      if (!isAllowedPublicProject(p)) continue;
      const id = p._id.toString();
      if (seen.has(id)) continue;
      seen.add(id);
      workspaces.push({
        id,
        name: p.name,
        desc: p.desc,
        categoryId: p.categoryId,
        roles: p.roles || [],
        slug: p.slug || "",
        ownerContact: p.ownerContact,
        city: p.city || "",
        state: p.state || "",
        status: p.status,
        relation: "owner",
      });
    }

    for (const p of joinedProjects) {
      if (!isAllowedPublicProject(p)) continue;
      const id = p._id.toString();
      if (seen.has(id)) continue;
      seen.add(id);
      workspaces.push({
        id,
        name: p.name,
        desc: p.desc,
        categoryId: p.categoryId,
        roles: p.roles || [],
        slug: p.slug || "",
        ownerContact: p.ownerContact,
        city: p.city || "",
        state: p.state || "",
        status: p.status,
        relation: "member",
      });
    }

    res.json(formatResponse(true, { workspaces }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// Explore — filter by city, category, skills
app.get("/api/explore", async (req, res) => {
  try {
    const { city, categoryId, skills, page: pageQ, limit: limitQ } = req.query;
    const page  = Math.max(1, parseInt(pageQ) || 1);
    const limit = Math.min(50, parseInt(limitQ) || 20);
    const skip  = (page - 1) * limit;

    const filter = { status: { $in: ["published", "in-progress"] } };
    if (city)       filter.city = new RegExp(city, "i");
    if (categoryId && categoryId !== "all") filter.categoryId = categoryId;
    if (skills) {
      const skillArr = String(skills).split(",").map(s => s.trim()).filter(Boolean);
      if (skillArr.length) filter.roles = { $in: skillArr.map(s => new RegExp(s, "i")) };
    }

    const projects = await Project.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const filtered = filterAllowedProjects(projects);
    const total = filtered.length;
    res.json(formatResponse(true, {
      projects: filtered.map(p => ({
        id: p._id.toString(),
        name: p.name,
        desc: p.desc,
        categoryId: p.categoryId,
        projectPurpose: p.projectPurpose || "college",
        roles: p.roles || [],
        city: p.city || "",
        state: p.state || "",
        slug: p.slug || "",
        salaryMin: p.salaryMin,
        salaryMax: p.salaryMax,
        currency: p.currency || "INR",
        ownerContact: p.ownerContact,
        createdAt: p.createdAt,
        joinedCount: (p.teamMembers || []).filter(m => m.status === "joined").length,
      })),
      total,
      page,
      hasMore: skip + limit < total,
    }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// Public project page by slug — for Next.js SSG
app.get("/api/p/:slug", async (req, res) => {
  try {
    const project = await Project.findOne({ slug: req.params.slug }).lean();
    if (!project) return res.status(404).json(formatResponse(false, null, "Project not found"));

    const posts = await Post.find({ projectId: project._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const enrichedPosts = await Promise.all(
      posts.map(async (post) => {
        const likeCount = await Like.countDocuments({ postId: post._id });
        const commentCount = await Comment.countDocuments({ postId: post._id });
        return { id: post._id.toString(), ...post, likeCount, commentCount };
      })
    );

    res.json(formatResponse(true, {
      project: {
        id: project._id.toString(),
        name: project.name,
        desc: project.desc,
        categoryId: project.categoryId,
        roles: project.roles || [],
        city: project.city || "",
        state: project.state || "",
        slug: project.slug || "",
        salaryMin: project.salaryMin,
        salaryMax: project.salaryMax,
        currency: project.currency || "INR",
        ownerContact: project.ownerContact,
        createdAt: project.createdAt,
        teamSize: (project.teamMembers || []).filter(m => m.status === "joined").length,
      },
      posts: enrichedPosts,
    }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// Get all published slugs — used by Next.js generateStaticParams
app.get("/api/slugs", async (req, res) => {
  try {
    const projects = await Project.find({ status: { $in: ["published", "in-progress"] }, slug: { $ne: "" } })
      .select("slug")
      .lean();
    res.json(formatResponse(true, { slugs: projects.map(p => p.slug) }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// ==================== POSTS ====================

// Create a new post for a project
app.post("/api/posts", authMiddleware, async (req, res) => {
  try {
    const { projectId, body, imageUrl } = req.body;
    const text = body?.trim() || "";
    const img = imageUrl?.trim() || "";
    if (!projectId || (!text && !img)) {
      return res.status(400).json(formatResponse(false, null, "projectId and body or image required"));
    }
    if (img.length > 2_500_000) {
      return res.status(400).json(formatResponse(false, null, "Image too large (max ~2MB)"));
    }
    const post = await Post.create({
      projectId,
      authorId: req.user?.contact || "",
      body: text || (img ? "📷 Photo update" : ""),
      imageUrl: img,
    });
    const likeCount = 0;
    const commentCount = 0;
    const project = await Project.findById(projectId).lean();
    const postPayload = {
      ...toClient(post),
      likeCount,
      commentCount,
      projectName: project?.name || "",
      projectSlug: project?.slug || "",
      projectCategory: project?.categoryId || "",
      projectCity: project?.city || "",
      projectState: project?.state || "",
    };
    io.to(`project_${projectId}`).emit("post_created", postPayload);
    io.emit("feed_post_created", postPayload);

    const authorContact = normalizeContact(req.user?.contact || "");
    const authorName = await displayNameForContact(authorContact);
    const teammates = await getTeammateContacts(projectId, authorContact);
    await notifyManyContacts(teammates, (mate) => ({
      projectId,
      type: "post",
      title: "New project post",
      message: `${authorName} posted in "${project?.name || "your project"}"`,
      actionUrl: `/posts`,
      metadata: {
        postId: post._id.toString(),
        authorContact,
        projectId: String(projectId),
      },
    }));

    const network = await getNetworkContacts(authorContact);
    await notifyManyContacts(network, (friend) => {
      if (teammates.includes(friend)) return null;
      return {
        projectId,
        type: "activity",
        title: "Friend posted an update",
        message: `${authorName} shared an update on "${project?.name || "a project"}"`,
        actionUrl: `/posts`,
        metadata: {
          postId: post._id.toString(),
          authorContact,
          projectId: String(projectId),
        },
      };
    });

    res.json(formatResponse(true, { post: postPayload }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// Toggle like on a post
app.post("/api/posts/:id/like", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.contact || "";
    const postId = req.params.id;
    const existing = await Like.findOne({ postId, userId });
    if (existing) {
      await Like.deleteOne({ _id: existing._id });
    } else {
      await Like.create({ postId, userId });
    }
    const likeCount = await Like.countDocuments({ postId });
    const liked = !existing;
    io.emit("post_liked", { postId, likeCount, liked, userId });

    if (liked) {
      const post = await Post.findById(postId).lean();
      const postAuthor = normalizeContact(post?.authorId || "");
      const likerName = await displayNameForContact(userId);
      if (postAuthor && postAuthor !== normalizeContact(userId)) {
        const postAuthorName = await displayNameForContact(postAuthor);
        await pushNotification({
          contact: postAuthor,
          projectId: post?.projectId,
          type: "like",
          title: "Someone liked your post",
          message: `${likerName} liked your update`,
          actionUrl: `/posts`,
          metadata: { postId, liker: userId, projectId: post?.projectId?.toString() },
        });

        const authorNetwork = await getNetworkContacts(postAuthor);
        await notifyManyContacts(
          authorNetwork.filter((f) => f !== normalizeContact(userId) && f !== postAuthor),
          (friend) => ({
            projectId: post?.projectId,
            type: "activity",
            title: "Friend activity",
            message: `${likerName} liked ${postAuthorName}'s post`,
            actionUrl: `/posts`,
            metadata: { postId, liker: userId },
          })
        );
      }
    }

    res.json(formatResponse(true, { likeCount, liked }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// Add comment to a post
app.post("/api/posts/:id/comments", authMiddleware, async (req, res) => {
  try {
    const { body, parentCommentId } = req.body;
    if (!body?.trim()) return res.status(400).json(formatResponse(false, null, "body required"));
    const comment = await Comment.create({
      postId: req.params.id,
      authorId: req.user?.contact || "",
      body: body.trim(),
      parentCommentId: parentCommentId || null,
    });
    io.emit("comment_added", { postId: req.params.id, comment: toClient(comment) });

    const post = await Post.findById(req.params.id).lean();
    const commenter = normalizeContact(req.user?.contact || "");
    const commenterName = await displayNameForContact(commenter);
    const postAuthor = normalizeContact(post?.authorId || "");
    const notifyTargets = new Set();

    if (postAuthor && postAuthor !== commenter) notifyTargets.add(postAuthor);

    if (parentCommentId) {
      const parent = await Comment.findById(parentCommentId).lean();
      const parentAuthor = normalizeContact(parent?.authorId || "");
      if (parentAuthor && parentAuthor !== commenter) notifyTargets.add(parentAuthor);
    }

    for (const target of notifyTargets) {
      await pushNotification({
        contact: target,
        projectId: post?.projectId,
        type: "comment",
        title: parentCommentId ? "New reply on a post" : "New comment on your post",
        message: `${commenterName} ${parentCommentId ? "replied" : "commented"}: "${body.trim().slice(0, 80)}${body.trim().length > 80 ? "…" : ""}"`,
        actionUrl: `/posts`,
        metadata: {
          postId: req.params.id,
          commentId: comment._id.toString(),
          commenter,
          projectId: post?.projectId?.toString(),
        },
      });
    }

    if (postAuthor) {
      const postAuthorName = await displayNameForContact(postAuthor);
      const network = await getNetworkContacts(postAuthor);
      await notifyManyContacts(
        network.filter((f) => f !== commenter && !notifyTargets.has(f)),
        (friend) => ({
          projectId: post?.projectId,
          type: "activity",
          title: "Friend commented on a post",
          message: `${commenterName} commented on ${postAuthorName}'s update`,
          actionUrl: `/posts`,
          metadata: { postId: req.params.id, commenter },
        })
      );
    }

    res.json(formatResponse(true, { comment: toClient(comment) }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// Get comments for a post (paginated, flat with replies grouped)
app.get("/api/posts/:id/comments", async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 30);
    const skip  = (page - 1) * limit;

    const comments = await Comment.find({ postId: req.params.id, parentCommentId: null })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const withReplies = await Promise.all(
      comments.map(async (c) => {
        const replies = await Comment.find({ parentCommentId: c._id }).sort({ createdAt: 1 }).lean();
        return {
          ...c,
          id: c._id.toString(),
          replies: replies.map(r => ({ ...r, id: r._id.toString() })),
        };
      })
    );

    const total = await Comment.countDocuments({ postId: req.params.id, parentCommentId: null });
    res.json(formatResponse(true, { comments: withReplies, total, page, hasMore: skip + limit < total }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// Get posts for a specific project
app.get("/api/projects/:projectId/posts", async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const posts = await Post.find({ projectId: req.params.projectId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const enriched = await Promise.all(
      posts.map(async (post) => {
        const likeCount = await Like.countDocuments({ postId: post._id });
        const commentCount = await Comment.countDocuments({ postId: post._id });
        return { id: post._id.toString(), ...post, likeCount, commentCount };
      })
    );

    const total = await Post.countDocuments({ projectId: req.params.projectId });
    res.json(formatResponse(true, { posts: enriched, total, page, hasMore: skip + limit < total }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// ==================== INVITES ====================

app.post("/api/invites/send", authMiddleware, async (req, res) => {
  try {
    const { projectId, receiverContact, role, message } = req.body;
    if (!projectId || !receiverContact) {
      return res
        .status(400)
        .json(formatResponse(false, null, "projectId and receiverContact required"));
    }

    const receiverErr = validateContact(receiverContact);
    if (receiverErr) {
      return res.status(400).json(formatResponse(false, null, receiverErr));
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json(formatResponse(false, null, "Project not found"));
    }
    if (!assertProjectOwner(req, res, project)) return;

    const senderContact = requireAuthContact(req, res);
    if (!senderContact) return;
    const invite = await Invite.create({
      projectId,
      senderContact,
      receiverContact: normalizeContact(receiverContact),
      role: role || "member",
      message: message || "",
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const receiver = await User.findOne({
      contact: normalizeContact(receiverContact),
    });
    const senderName = await displayNameForContact(senderContact);
    if (receiver) {
      await pushNotification({
        userId: receiver._id.toString(),
        projectId,
        type: "invite",
        title: "Project invite",
        message: `${senderName} invited you to join "${project.name}" as ${role || "member"}`,
        actionUrl: `/projects/${projectId}`,
        metadata: { senderContact, projectId: String(projectId) },
      });
    }

    res.json(formatResponse(true, { invite: toClient(invite) }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

app.post("/api/invites/:inviteId/accept", authMiddleware, async (req, res) => {
  try {
    const invite = await Invite.findByIdAndUpdate(
      req.params.inviteId,
      { status: "accepted" },
      { new: true }
    );
    if (!invite) {
      return res.status(404).json(formatResponse(false, null, "Invite not found"));
    }
    const authContact = requireAuthContact(req, res);
    if (!authContact) return;
    if (normalizeContact(invite.receiverContact) !== authContact) {
      return res.status(403).json(formatResponse(false, null, "This invite is not for your account"));
    }

    const project = await Project.findById(invite.projectId);
    if (project) {
      const exists = project.teamMembers?.some(
        (m) => m.contact === invite.receiverContact
      );
      if (!exists) {
        await assertCanAddTeamMember(project);
        project.teamMembers.push({
          contact: invite.receiverContact,
          role: invite.role || "member",
          status: "joined",
          joinedAt: new Date(),
        });
        await project.save();
      }

      await Activity.create({
        projectId: project._id,
        userId: invite.receiverContact,
        type: "member_joined",
        description: `${invite.receiverContact} joined the project`,
      });

      io.to(`project_${project._id}`).emit("member_status_changed", {
        projectId: project._id.toString(),
        memberContact: invite.receiverContact,
        status: "joined",
      });

      const accepterName = await displayNameForContact(authContact);
      await pushNotification({
        contact: invite.senderContact,
        projectId: project._id,
        type: "join",
        title: "Invite accepted",
        message: `${accepterName} accepted your invite to "${project.name}"`,
        actionUrl: `/projects/${project._id}`,
        metadata: { memberContact: authContact, projectId: project._id.toString() },
      });
    }

    res.json(formatResponse(true, { invite: toClient(invite) }));
  } catch (error) {
    if (error.code === "PLAN_LIMIT") {
      return res.status(403).json({ success: false, error: error.message, code: "PLAN_LIMIT" });
    }
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// Decline invite
app.post("/api/invites/:inviteId/decline", authMiddleware, async (req, res) => {
  try {
    const invite = await Invite.findById(req.params.inviteId);
    if (!invite) return res.status(404).json(formatResponse(false, null, "Invite not found"));
    const authContact = requireAuthContact(req, res);
    if (!authContact) return;
    if (normalizeContact(invite.receiverContact) !== authContact) {
      return res.status(403).json(formatResponse(false, null, "This invite is not for your account"));
    }
    const updated = await Invite.findByIdAndUpdate(
      req.params.inviteId,
      { status: "declined" },
      { new: true }
    );
    res.json(formatResponse(true, { invite: toClient(updated) }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// Get invites received by a contact (for join dashboard "Invitations" tab)
app.get("/api/invites/received", authMiddleware, async (req, res) => {
  try {
    const contact = requireAuthContact(req, res);
    if (!contact) return;
    const invites = await Invite.find({ receiverContact: contact })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const enriched = await Promise.all(
      invites.map(async (inv) => {
        const project = await Project.findById(inv.projectId).lean();
        return {
          ...inv,
          id: inv._id?.toString(),
          projectName: project?.name || "Unknown Project",
          projectCategory: project?.categoryId || "",
          projectSalaryMin: project?.salaryMin,
          projectSalaryMax: project?.salaryMax,
          projectCurrency: project?.currency || "INR",
        };
      })
    );
    res.json(formatResponse(true, { invites: enriched }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// Get invites sent for a specific project (for creator "Requests" tab)
app.get("/api/projects/:projectId/invites", authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json(formatResponse(false, null, "Project not found"));
    if (!assertProjectOwner(req, res, project)) return;
    const invites = await Invite.find({ projectId: req.params.projectId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(formatResponse(true, { invites: invites.map(inv => ({ ...inv, id: inv._id?.toString() })) }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// Get top-paying published projects for homepage salary section

// ==================== NOTIFICATIONS ====================

app.put("/api/notifications/:notificationId/read", authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.notificationId,
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json(formatResponse(false, null, "Notification not found"));
    }
    res.json(formatResponse(true, { notification: toClient(notification) }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// ==================== CO-FOUNDER MATCHING ====================

/* Scoring weights */
const W = {
  SKILL_COMPLEMENT: 50,  // fills skills you/project lacks
  SKILL_BREADTH:    10,  // how many skills they have overall
  CATEGORY_EXP:     20,  // worked in same / adjacent category before
  ACTIVITY:         10,  // how recently active
  LOCATION:         10,  // same city / state as project
};

const ADJACENT_CATEGORIES = {
  tech:       ["design", "finance", "education"],
  design:     ["tech", "marketing", "content"],
  marketing:  ["design", "content", "social"],
  content:    ["marketing", "design", "education"],
  finance:    ["tech", "social"],
  education:  ["tech", "content", "social"],
  health:     ["tech", "social"],
  social:     ["marketing", "content", "education", "health"],
};

function normSkill(s) { return s.toLowerCase().trim(); }
function skillsOverlap(a, b) {
  const na = a.map(normSkill);
  const nb = new Set(b.map(normSkill));
  return na.filter(s => {
    if (nb.has(s)) return true;
    // partial match — "react" matches "react native"
    for (const t of nb) if (s.includes(t) || t.includes(s)) return true;
    return false;
  });
}

app.get("/api/match/cofounder", authMiddleware, async (req, res) => {
  try {
    const { projectId, limit = 20 } = req.query;
    if (!projectId) return res.status(400).json(formatResponse(false, null, "projectId required"));

    // ── Load project ──────────────────────────────────────────────
    const project = await Project.findById(projectId).lean();
    if (!project) return res.status(404).json(formatResponse(false, null, "Project not found"));

    const ownerContact = normalizeContact(project.ownerContact);
    const ownerPlan = await getUserPlan(ownerContact);
    const resultLimit =
      ownerPlan === "pro"
        ? parseInt(limit, 10)
        : Math.min(parseInt(limit, 10) || 20, 5);
    const neededSkills = project.roles || [];

    // ── Load owner's own skills ──────────────────────────────────
    const ownerUser = await User.findOne({ contact: ownerContact }).lean();
    const ownerSkills = ownerUser?.skills || [];

    // skill gap = what the project needs that the owner doesn't have
    const skillGap = neededSkills.filter(ns => {
      const norm = normSkill(ns);
      return !ownerSkills.some(os => {
        const o = normSkill(os);
        return o === norm || o.includes(norm) || norm.includes(o);
      });
    });

    // Already on the team
    const teamContacts = new Set([
      ownerContact,
      ...(project.teamMembers || []).map(m => normalizeContact(m.contact)),
    ]);

    // ── Collaboration history of owner ───────────────────────────
    // Find all past team contacts the owner has worked with
    const ownerPastProjects = await Project.find({
      $or: [
        { ownerContact },
        { "teamMembers.contact": ownerContact },
      ],
    }).lean();

    const ownerCollabContacts = new Set();
    for (const p of ownerPastProjects) {
      for (const m of (p.teamMembers || [])) {
        if (normalizeContact(m.contact) !== ownerContact) {
          ownerCollabContacts.add(normalizeContact(m.contact));
        }
      }
    }

    // ── Fetch all candidate users ────────────────────────────────
    const candidates = await User.find({
      contact: { $nin: [...teamContacts] },
    })
      .lean()
      .limit(300); // score the best 300, return top N

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);

    // ── Preload category experience for all candidates ───────────
    // Find projects each candidate has been on
    const allProjectMemberships = await Project.find({
      $or: [
        { ownerContact: { $in: candidates.map(c => c.contact) } },
        { "teamMembers.contact": { $in: candidates.map(c => c.contact) } },
      ],
    }).select("categoryId ownerContact teamMembers").lean();

    const categoryExpMap = {}; // contact -> Set of categoryIds
    for (const p of allProjectMemberships) {
      const contacts = [
        p.ownerContact,
        ...(p.teamMembers || []).map(m => m.contact),
      ].map(normalizeContact).filter(Boolean);
      for (const c of contacts) {
        if (!categoryExpMap[c]) categoryExpMap[c] = new Set();
        categoryExpMap[c].add(p.categoryId);
      }
    }

    // ── Score each candidate ──────────────────────────────────────
    const scored = candidates.map(candidate => {
      const cContact = normalizeContact(candidate.contact);
      const cSkills  = candidate.skills || [];

      // 1. Skill complementarity
      const filledGap = skillsOverlap(skillGap.length > 0 ? skillGap : neededSkills, cSkills);
      const complementScore = skillGap.length > 0
        ? (filledGap.length / skillGap.length) * W.SKILL_COMPLEMENT
        : (filledGap.length / Math.max(neededSkills.length, 1)) * W.SKILL_COMPLEMENT;

      // 2. Skill breadth
      const breadthScore = Math.min(cSkills.length / 6, 1) * W.SKILL_BREADTH;

      // 3. Category experience
      const catExp = categoryExpMap[cContact] || new Set();
      let catScore = 0;
      if (catExp.has(project.categoryId)) {
        catScore = W.CATEGORY_EXP;
      } else {
        const adjacent = ADJACENT_CATEGORIES[project.categoryId] || [];
        if (adjacent.some(a => catExp.has(a))) catScore = W.CATEGORY_EXP * 0.5;
      }

      // 4. Activity recency
      let actScore = 0;
      const lastActive = candidate.lastActive ? new Date(candidate.lastActive) : null;
      if (lastActive) {
        if (lastActive >= sevenDaysAgo)  actScore = W.ACTIVITY;
        else if (lastActive >= thirtyDaysAgo) actScore = W.ACTIVITY * 0.5;
      } else if (new Date(candidate.createdAt) >= thirtyDaysAgo) {
        actScore = W.ACTIVITY * 0.5; // recently joined = signal
      }

      // 5. Location proximity (city / state)
      let locScore = 0;
      if (project.city && candidate.city) {
        if (normSkill(candidate.city) === normSkill(project.city))   locScore = W.LOCATION;
        else if (normSkill(candidate.state || "") === normSkill(project.state || "")) locScore = W.LOCATION * 0.5;
      } else if (candidate.college) {
        // Both in India, small proximity bonus for Telangana users on Telangana projects
        if (project.state && normSkill(project.state).includes("telangana")) locScore = W.LOCATION * 0.5;
        else locScore = W.LOCATION * 0.2;
      }

      // 6. Past collaboration — boost if they've worked together before
      const collabBonus = ownerCollabContacts.has(cContact) ? 8 : 0;

      const total = Math.min(
        Math.round(complementScore + breadthScore + catScore + actScore + locScore + collabBonus),
        100
      );

      // ── "Why we matched" reasons ─────────────────────────────
      const reasons = [];
      if (filledGap.length > 0) {
        reasons.push(`Brings ${filledGap.slice(0, 3).join(", ")}${filledGap.length > 3 ? ` +${filledGap.length - 3} more` : ""}`);
      }
      if (catScore === W.CATEGORY_EXP) {
        reasons.push(`Has ${project.categoryId} project experience`);
      } else if (catScore > 0) {
        reasons.push(`Experience in related fields`);
      }
      if (locScore >= W.LOCATION) reasons.push(`Same city — ${candidate.city}`);
      else if (locScore > 0 && candidate.city)  reasons.push(`Nearby — ${candidate.city || candidate.state || "India"}`);
      if (collabBonus)   reasons.push("You've collaborated before");
      if (reasons.length === 0 && cSkills.length > 0) reasons.push(`${cSkills.length} skills on profile`);

      return {
        id:             candidate._id.toString(),
        name:           candidate.name,
        contact:        cContact,
        skills:         cSkills,
        college:        candidate.college  || "",
        city:           candidate.city     || "",
        state:          candidate.state    || "",
        graduationYear: candidate.graduationYear || "",
        lastActive:     candidate.lastActive,
        score:          total,
        filledSkills:   filledGap,
        gapSkills:      skillGap.filter(s => !filledGap.includes(s)),
        reasons,
        scoreBreakdown: {
          skill:    Math.round(complementScore),
          breadth:  Math.round(breadthScore),
          category: Math.round(catScore),
          activity: Math.round(actScore),
          location: Math.round(locScore),
          collab:   collabBonus,
        },
      };
    });

    // Sort: score desc, then by skill breadth desc
    scored.sort((a, b) => b.score - a.score || b.skills.length - a.skills.length);

    // Only return candidates with at least 1 signal (score > 0)
    const results = scored
      .filter(c => c.score > 0)
      .slice(0, resultLimit);

    res.json(formatResponse(true, {
      matches: results,
      meta: {
        total:       scored.filter(c => c.score > 0).length,
        skillGap,
        ownerSkills,
        projectCategory: project.categoryId,
        projectCity:     project.city || "",
      },
    }));
  } catch (error) {
    console.error("Match error:", error);
    res.status(500).json(formatResponse(false, null, error.message));
  }
});

// ==================== AI CO-FOUNDER ====================

const COFOUNDER_ACTIONS = [
  "suggest-tasks",
  "draft-dm",
  "generate-pitch",
  "check-health",
  "validate-idea",
  "target-user",
  "build-first",
  "biggest-risk",
  "custom",
];

function projectToCofounderDoc(project) {
  return {
    name: project.name,
    desc: project.desc || project.description || "",
    categoryId: project.categoryId,
    roles: project.roles || [],
    salaryMax: project.salaryMax,
    city: project.city,
    state: project.state,
    tasks: project.tasks || [],
    teamMembers: project.teamMembers || [],
    createdAt: project.createdAt,
  };
}

app.get("/api/ai/cofounder/status", authMiddleware, (req, res) => {
  const provider = isAnthropicConfigured()
    ? "anthropic"
    : isGroqConfigured()
      ? "groq"
      : "demo";
  res.json(
    formatResponse(true, {
      provider,
      anthropic: isAnthropicConfigured(),
      groq: isGroqConfigured(),
      contextWindow: CONTEXT_WINDOW,
    })
  );
});

app.post("/api/ai/cofounder/stream", authMiddleware, async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  const send = (obj) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`);
  };

  try {
    const { projectId, messages = [], action, context = {} } = req.body;
    if (!projectId) {
      send({ type: "error", message: "projectId required" });
      return res.end();
    }

    const project = await Project.findById(projectId).lean();
    if (!project) {
      send({ type: "error", message: "Project not found" });
      return res.end();
    }

    const projectDoc = projectToCofounderDoc(project);
    const systemPrompt = buildCofounderSystemPrompt(projectDoc);
    let fullText = "";

    const result = await streamCofounderReply({
      project: projectDoc,
      history: messages,
      action,
      context,
      onDelta: (text) => {
        fullText += text;
        send({ type: "delta", text });
      },
    });

    const ctxUsage = computeContextUsage(
      systemPrompt,
      normalizeHistory(messages),
      fullText
    );

    send({
      type: "done",
      devMode: result.devMode,
      provider: result.provider,
      projectName: project.name,
      usage: {
        inputTokens: result.usage?.inputTokens ?? ctxUsage.inputTokens,
        outputTokens: result.usage?.outputTokens ?? ctxUsage.outputTokens,
        totalUsed: ctxUsage.totalUsed,
        percent: ctxUsage.percent,
        contextWindow: CONTEXT_WINDOW,
      },
    });
  } catch (error) {
    send({
      type: "error",
      message: error?.message || "Stream failed",
    });
  } finally {
    res.end();
  }
});

const groq = isGroqConfigured() ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const CATEGORY_CONTEXT = {
  tech:      "software / app development startup",
  design:    "design / branding / UX project",
  marketing: "marketing / growth / social media project",
  content:   "content creation / writing / video project",
  finance:   "fintech / finance / business project",
  education: "edtech / tutoring / learning platform",
  health:    "healthtech / wellness / medical project",
  social:    "social impact / NGO / community project",
  other:     "general project",
};

function buildSystemPrompt(project) {
  const catCtx = CATEGORY_CONTEXT[project.categoryId] || "project";
  const cityCtx = project.city ? `, based in ${project.city}, ${project.state || "India"}` : ", India";
  return `You are an expert AI co-founder and advisor for "Make Big" — India's student collaboration platform. You are helping a college student run their ${catCtx} called "${project.name}"${cityCtx}.

Project description: ${project.desc || "No description provided."}
Skills they need: ${(project.roles || []).join(", ") || "Not specified"}
Monthly budget: ${project.salaryMax ? `₹${project.salaryMax.toLocaleString()}/mo` : "Not specified"}

Your tone is direct, practical, encouraging, and tailored for Indian college students. You are opinionated — give concrete advice, not vague platitudes. Keep responses concise and actionable (max 300 words unless generating specific content like a pitch or DM). Use bullet points when listing items. Never use corporate buzzwords. Sound like a smart co-founder, not a consultant.`;
}

const DEV_RESPONSES = {
  "suggest-tasks": {
    content: `Here are 6 tasks to move your project forward:\n\n• **Set up a shared workspace** — Create a Notion/Trello board with project goals, deadlines, and task ownership. Do this today.\n• **Write a 1-page project brief** — Name, problem, solution, target user, and what success looks like in 30 days. Forces clarity.\n• **Find your first 3 real users** — Not friends. Talk to 3 strangers who have the problem you're solving. Record what they say.\n• **Build the smallest possible demo** — A Figma mockup, a landing page, or a 2-minute video walkthrough. Something tangible.\n• **Post your first project update** — Use the Project Feed to announce you're live. Attracts future team members and advisors.\n• **Set a weekly sync schedule** — Even 30 minutes every Sunday on a call. Projects die from poor communication.\n\n_Add the API key in .env to get AI-generated tasks specific to your project category._`,
  },
  "draft-dm": {
    content: `Here's a cold DM you can send:\n\n---\n\nHey [Name], I came across your profile and saw your experience with [their skill]. I'm building [project name] — [one sentence on what it does and why it matters].\n\nWe're a small team of [X] working on this seriously. I think your [specific skill] would be really valuable for [specific part of the project].\n\nWould you be open to a 20-min call this week to see if there's a fit?\n\n— [Your name]\n\n---\n\n_Tip: Personalise the first sentence. Generic DMs get ignored. Mention one specific thing about their work._`,
  },
  "generate-pitch": {
    content: `Here's a project pitch you can use:\n\n---\n\n**The Problem:** [Describe a frustrating experience your target user has — be specific and vivid. Use a real example if possible.]\n\n**What we're building:** [Project name] is a [one-line description]. Unlike [existing solution], we [key differentiator]. We're focused on [specific user group] in India, starting with [city].\n\n**Where we are:** Early stage. Small, focused team. We've [most significant thing you've done — even if small]. We're looking for [skill 1] and [skill 2] who believe in [core value] and want to build something real.\n\n---\n\n_Add GROQ_API_KEY in .env (get a free key at console.groq.com) to get a pitch tailored to your actual project._`,
  },
  "check-health": {
    content: null,
  },
};

app.post("/api/ai/cofounder", authMiddleware, async (req, res) => {
  try {
    const { action, projectId, context = {} } = req.body;
    if (!projectId || !COFOUNDER_ACTIONS.includes(action)) {
      return res.status(400).json(formatResponse(false, null, "projectId and valid action required"));
    }

    const project = await Project.findById(projectId).lean();
    if (!project) return res.status(404).json(formatResponse(false, null, "Project not found"));

    const ownerPlan = await getUserPlan(normalizeContact(project.ownerContact));

    // ── Build the user message based on action ──
    let userMessage = "";

    if (action === "suggest-tasks") {
      const existingTasks = (project.tasks || []).map(t => t.title).join(", ") || "none yet";
      userMessage = `Suggest 6–8 specific, actionable next tasks for my project. Current tasks: ${existingTasks}. Focus on tasks that drive real progress, not busywork. Format each as: **Task title** — why it matters (one sentence).`;

    } else if (action === "draft-dm") {
      const { targetName = "the person", targetSkill = "their skills", targetRole = "team member" } = context;
      userMessage = `Draft a short, genuine cold DM (3–5 sentences) to invite ${targetName} — who has ${targetSkill} — to join my project as a ${targetRole}. Don't be generic. Make it specific to my project. Include a clear call-to-action. Format with a clear separator line at top and bottom.`;

    } else if (action === "generate-pitch") {
      userMessage = `Generate a compelling 3-paragraph pitch for my project. Structure: (1) The problem/opportunity we're addressing, (2) What we're building and our unique angle, (3) Who we're looking for and why join us now. Make it authentic and exciting for college students in India. After the pitch, add 3 bullet points of "why join us now" hooks.`;

    } else if (action === "check-health") {
      // Compute stalling metrics
      const lastActivity = await Activity.findOne({ projectId: project._id })
        .sort({ createdAt: -1 })
        .lean();
      const lastMessage = await Message.findOne({ projectId: project._id })
        .sort({ createdAt: -1 })
        .lean();
      const totalTasks     = (project.tasks || []).length;
      const doneTasks      = (project.tasks || []).filter(t => t.status === "done").length;
      const teamCount      = (project.teamMembers || []).filter(m => m.status === "joined").length;
      const daysSinceAct   = lastActivity
        ? Math.floor((Date.now() - new Date(lastActivity.createdAt)) / 86400000)
        : 999;
      const daysSinceMsg   = lastMessage
        ? Math.floor((Date.now() - new Date(lastMessage.createdAt)) / 86400000)
        : 999;
      const completionPct  = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
      const daysSinceCreate = Math.floor((Date.now() - new Date(project.createdAt)) / 86400000);

      userMessage = `Assess my project's health based on these metrics and give me a direct diagnosis + 3 specific actions to take this week:

- Project age: ${daysSinceCreate} days old
- Team members: ${teamCount} joined
- Tasks: ${doneTasks}/${totalTasks} done (${completionPct}% complete)
- Last activity logged: ${daysSinceAct === 999 ? "never" : `${daysSinceAct} days ago`}
- Last team message: ${daysSinceMsg === 999 ? "never" : `${daysSinceMsg} days ago`}

Start with a clear verdict: 🟢 Healthy / 🟡 Slowing / 🔴 Stalling — and explain why in one sentence. Then give the 3 actions.`;

    } else if (action === "custom") {
      userMessage = String(context.message || "").trim();
      if (!userMessage) return res.status(400).json(formatResponse(false, null, "message required for custom action"));
    }

    // ── No Groq key — return dev-mode placeholder ──
    if (!groq) {
      let devContent = DEV_RESPONSES[action]?.content;

      if (action === "check-health") {
        const daysSinceCreate = Math.floor((Date.now() - new Date(project.createdAt)) / 86400000);
        const totalTasks = (project.tasks || []).length;
        const doneTasks  = (project.tasks || []).filter(t => t.status === "done").length;
        const teamCount  = (project.teamMembers || []).filter(m => m.status === "joined").length;
        const completionPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
        const isStalling = daysSinceCreate > 7 && teamCount < 2 && doneTasks === 0;
        devContent = `**${isStalling ? "🔴 Stalling" : teamCount > 1 ? "🟢 Healthy" : "🟡 Slowing"}** — ${isStalling ? "no team and no task progress in a week" : "early stage, some momentum present"}.

• **Get 1 more person on the team today** — A project with 1 person almost always dies. Post in college WhatsApp groups right now with your 1-sentence pitch.
• **Create your first 3 tasks** — Even tiny ones. Progress compounds. Open Dashboard → Overview → New Task.
• **Post a project update in the Feed** — Visibility attracts collaborators. Even "We started!" counts.

_To get AI-powered health analysis, add GROQ_API_KEY to .env (or backend/.env) and restart the server._`;
      } else if (action === "custom") {
        devContent = `I'm running in demo mode — add your Groq API key to \`.env\` or \`backend/.env\` as \`GROQ_API_KEY=gsk_...\` and restart \`npm run dev\`.\n\nYour question was: _"${userMessage}"_\n\nGet a free key at console.groq.com — then I can answer questions about your project, suggest strategies, and draft content.`;
      }

      return res.json(formatResponse(true, {
        response: devContent,
        action,
        projectName: project.name,
        devMode: true,
      }));
    }

    // ── Real Groq call ──
    const systemPrompt = buildSystemPrompt(project);
    try {
      const completion = await groq.chat.completions.create({
        model:      GROQ_MODEL,
        max_tokens: 1024,
        messages: [
          { role: "system",  content: systemPrompt },
          { role: "user",    content: userMessage  },
        ],
      });

      const responseText = completion.choices[0]?.message?.content || "";
      return res.json(formatResponse(true, {
        response: responseText,
        action,
        projectName: project.name,
        devMode: false,
      }));
    } catch (groqError) {
      console.error("Groq API error:", groqError.message);
      const devContent = `**AI unavailable** — check GROQ_API_KEY on Render (free key at console.groq.com).\n\n${DEV_RESPONSES[action]?.content || `Your question: _"${userMessage}"_`}`;
      return res.json(formatResponse(true, {
        response: devContent,
        action,
        projectName: project.name,
        devMode: true,
      }));
    }

  } catch (error) {
    if (error.code === "PLAN_LIMIT") {
      return res.status(403).json({ success: false, error: error.message, code: "PLAN_LIMIT" });
    }
    console.error("AI cofounder error:", error.message);
    res.status(500).json(formatResponse(false, null, "AI service error: " + error.message));
  }
});

// ==================== COURSES ====================

function formatCourse(doc, enrollment = null) {
  const base = toClient(doc);
  if (!base) return null;
  const lessonCount = base.lessons?.length || 0;
  const completedCount = enrollment?.completedLessonIds?.length || 0;
  return {
    ...base,
    lessonCount,
    enrolled: !!enrollment,
    completedLessonIds: enrollment?.completedLessonIds || [],
    progress: lessonCount ? Math.round((completedCount / lessonCount) * 100) : 0,
    completed: lessonCount > 0 && completedCount >= lessonCount,
  };
}

app.get("/api/courses", async (req, res) => {
  try {
    const { categoryId, skills, q, limit = "20", page = "1" } = req.query;
    const filter = { published: true };
    if (categoryId) filter.categoryId = String(categoryId);
    if (skills) {
      const terms = String(skills)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (terms.length) filter.skills = { $in: terms };
    }
    if (q) {
      const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ title: rx }, { description: rx }, { skills: rx }];
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [courses, total] = await Promise.all([
      Course.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Course.countDocuments(filter),
    ]);

    res.json(
      formatResponse(true, {
        courses: courses.map((c) => formatCourse(c)),
        total,
        page: pageNum,
        hasMore: skip + courses.length < total,
      })
    );
  } catch (err) {
    console.error("GET /api/courses:", err);
    res.status(500).json(formatResponse(false, null, "Failed to load courses"));
  }
});

app.get("/api/courses/my", authMiddleware, async (req, res) => {
  try {
    const contact = normalizeContact(req.user?.contact);
    const enrollments = await CourseEnrollment.find({ userContact: contact });
    const courseIds = enrollments.map((e) => e.courseId);
    const courses = await Course.find({ _id: { $in: courseIds }, published: true });
    const byCourse = new Map(enrollments.map((e) => [e.courseId.toString(), e]));
    res.json(
      formatResponse(
        true,
        courses.map((c) => formatCourse(c, byCourse.get(c._id.toString())))
      )
    );
  } catch (err) {
    console.error("GET /api/courses/my:", err);
    res.status(500).json(formatResponse(false, null, "Failed to load your courses"));
  }
});

app.get("/api/courses/:slug", async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug, published: true });
    if (!course) {
      return res.status(404).json(formatResponse(false, null, "Course not found"));
    }

    let enrollment = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const jwt = await import("jsonwebtoken");
        const token = authHeader.slice(7);
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET || "dev-secret");
        const contact = normalizeContact(decoded.contact);
        enrollment = await CourseEnrollment.findOne({
          userContact: contact,
          courseId: course._id,
        });
      } catch {
        /* optional auth */
      }
    }

    res.json(formatResponse(true, formatCourse(course, enrollment)));
  } catch (err) {
    console.error("GET /api/courses/:slug:", err);
    res.status(500).json(formatResponse(false, null, "Failed to load course"));
  }
});

app.post("/api/courses/:courseId/enroll", authMiddleware, async (req, res) => {
  try {
    const contact = normalizeContact(req.user?.contact);
    const course = await Course.findOne({ _id: req.params.courseId, published: true });
    if (!course) {
      return res.status(404).json(formatResponse(false, null, "Course not found"));
    }

    let enrollment = await CourseEnrollment.findOne({
      userContact: contact,
      courseId: course._id,
    });
    if (!enrollment) {
      enrollment = await CourseEnrollment.create({
        userContact: contact,
        courseId: course._id,
        completedLessonIds: [],
      });
    }

    res.json(formatResponse(true, formatCourse(course, enrollment)));
  } catch (err) {
    console.error("POST /api/courses/:courseId/enroll:", err);
    res.status(500).json(formatResponse(false, null, "Failed to enroll"));
  }
});

app.post(
  "/api/courses/:courseId/lessons/:lessonId/complete",
  authMiddleware,
  async (req, res) => {
    try {
      const contact = normalizeContact(req.user?.contact);
      const course = await Course.findOne({ _id: req.params.courseId, published: true });
      if (!course) {
        return res.status(404).json(formatResponse(false, null, "Course not found"));
      }

      const lessonId = String(req.params.lessonId);
      const hasLesson = course.lessons.some((l) => l._id.toString() === lessonId);
      if (!hasLesson) {
        return res.status(404).json(formatResponse(false, null, "Lesson not found"));
      }

      let enrollment = await CourseEnrollment.findOne({
        userContact: contact,
        courseId: course._id,
      });
      if (!enrollment) {
        enrollment = await CourseEnrollment.create({
          userContact: contact,
          courseId: course._id,
          completedLessonIds: [lessonId],
        });
      } else if (!enrollment.completedLessonIds.includes(lessonId)) {
        enrollment.completedLessonIds.push(lessonId);
        await enrollment.save();
      }

      const lessonCount = course.lessons.length;
      const done = enrollment.completedLessonIds.length;
      if (lessonCount > 0 && done >= lessonCount && !enrollment.completedAt) {
        enrollment.completedAt = new Date();
        await enrollment.save();
      }

      res.json(formatResponse(true, formatCourse(course, enrollment)));
    } catch (err) {
      console.error("POST complete lesson:", err);
      res.status(500).json(formatResponse(false, null, "Failed to update progress"));
    }
  }
);

// ==================== SOCKET.IO ====================

io.use(socketAuthMiddleware);
setupSocketEvents(io);

// ==================== START ====================

async function attachNextApp() {
  if (process.env.SERVE_NEXT !== "true") return;

  process.env.INTERNAL_API_URL = `http://127.0.0.1:${PORT}`;

  const next = (await import("next")).default;
  const nextApp = next({ dev: false, dir: __rootDir });
  await nextApp.prepare();
  const handle = nextApp.getRequestHandler();

  // Forward only non-API traffic to Next.js (keep Express /api/* + Socket.io on this server).
  app.use((req, res) => {
    const path = req.path || "";
    if (path.startsWith("/api/") || path.startsWith("/socket.io")) {
      if (!res.headersSent) {
        res.status(404).json(formatResponse(false, null, "API route not found"));
      }
      return;
    }
    return handle(req, res);
  });
  console.log("Next.js mounted on same port (SERVE_NEXT=true)");
}

async function start() {
  await connectDB();
  await attachNextApp();
  httpServer.listen(PORT, "0.0.0.0", () => {
    const mode = process.env.SERVE_NEXT === "true" ? "API + Next.js" : "API only";
    console.log(`
╔════════════════════════════════════════════════════════╗
║  Make Big — ${mode.padEnd(38)}║
║  http://localhost:${PORT}                                  ║
║  Frontend: ${process.env.FRONTEND_URL || "http://localhost:3000"}              ║
╚════════════════════════════════════════════════════════╝
`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

export default app;
