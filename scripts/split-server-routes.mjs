/**
 * One-time helper: extracts non-auth routes from server-new.js into legacy.routes.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = fs.readFileSync(path.join(root, "server-new.js"), "utf8");
const lines = src.split("\n");

// 0-indexed slices
const helpers = lines.slice(143, 290).join("\n"); // toClient … displayNameForContact
const routes = lines.slice(527, 5550).join("\n"); // health … last route (before socket)

const header = `import mongoose from "mongoose";
import Groq from "groq-sdk";

import { authMiddleware, socketAuthMiddleware } from "../middleware/auth.js";
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
  isProjectOwner,
  isProjectMember,
  sanitizeProjectUpdate,
  allowDevOtp,
  otpDeliveryConfigured,
} from "../middleware/security.js";
import { setupSocketEvents } from "../events/socketEvents.js";
import { normalizeContact, formatResponse } from "../utils/helpers.js";
import {
  topVerifiedByCategory,
  computeProjectReadiness,
} from "../utils/startupReadiness.js";
import { filterAllowedProjects, isAllowedPublicProject } from "../utils/projectAllowlist.js";
import { getViewerProjectRelation, shouldHideFromExploreFeed } from "../utils/projectMembership.js";
import {
  demoProjectExcludeFilter,
  demoUserExcludeFilter,
  isDemoProject,
  DEMO_PROJECT_SLUGS,
  DEMO_CONTACT_PATTERN,
} from "../utils/demoData.js";
import { dedupeProjectsForDisplay } from "../utils/dedupeProjects.js";
import {
  assertCanCreateProject,
  assertCanAddTeamMember,
  getUserPlan,
  assertProFeature,
} from "../utils/subscription.js";

import User from "../models/User.js";
import Profile from "../models/Profile.js";
import Project from "../models/Project.js";
import Message from "../models/Message.js";
import Activity from "../models/Activity.js";
import FriendRequest from "../models/FriendRequest.js";
import Notification from "../models/Notification.js";
import Post from "../models/Post.js";
import Like from "../models/Like.js";
import Comment from "../models/Comment.js";
import Course from "../models/Course.js";
import CourseEnrollment from "../models/CourseEnrollment.js";
import Invite from "../models/Invite.js";
import StartupFollow from "../models/StartupFollow.js";
import StartupBookmark from "../models/StartupBookmark.js";
import IdeaValidation from "../models/IdeaValidation.js";
import StandupLog from "../models/StandupLog.js";
import ProjectNote from "../models/ProjectNote.js";
import Report from "../models/Report.js";
import {
  getISTDateString,
  getISTDateLabel,
  getActiveMemberContacts,
  formatStandupMessage,
  formatStandupSummaryText,
  generateStandupSummaryAI,
  buildSmartTasksPrompt,
  buildExtractTasksPrompt,
  parseJsonTasks,
  DEV_SMART_TASKS,
  parseGithubRepo,
} from "../ai/projectManager.js";
import {
  validateIdeaWithAI,
  reportToMarkdown,
  generateClarifyingQuestions,
  generateFullValidationReport,
  generatePitchDeckOutline,
  pitchDeckToText,
} from "../ai/ideaValidator.js";
import {
  computeProjectHealth,
  computeUserReputation,
  getFeaturedStartups,
  journeyTimeline,
  sanitizeJourneyForApi,
  recordJourneyActivity,
  notifyFollowers,
  INVITE_ROLE_TYPES,
} from "../utils/ecosystem.js";
import { sendOtpEmail, isEmailOtpConfigured } from "../../lib/emailOtp.js";
import { sendTaskReminderEmail } from "../../lib/taskReminderEmail.js";
import {
  gatherProjectWeeklyData,
  generateWeeklyReportAI,
  sendWeeklyReportEmail,
  getISTWeekKey,
  isSunday8pmIST,
  weekLabelIST,
} from "../../lib/weeklyReport.js";
import { sendHealthAlertEmail, daysSince } from "../../lib/healthAlertEmail.js";
import { sendPushToUser, isPushConfigured } from "../../lib/pushNotifications.js";
import {
  upsertVerifiedUser,
  findUserByContact,
  loginExistingUserAfterOtp,
} from "../../lib/userUpsert.js";
import {
  streamCofounderReply,
  computeContextUsage,
  buildSystemPrompt as buildCofounderSystemPrompt,
  normalizeHistory,
  isAnthropicConfigured,
  isGroqConfigured,
  CONTEXT_WINDOW,
} from "../ai/cofounder.js";
import {
  validateLinkUrl,
  fetchLinkContent,
  getProjectLinkContext,
  buildLinkReaderPrompt,
  streamLinkReaderAdvice,
  assertLinkReadQuota,
  getLinkReadUsage,
  saveLinkHistory,
  getProjectLinkHistory,
} from "../ai/linkReader.js";
import AgentRun from "../models/AgentRun.js";
import Build from "../models/Build.js";
import {
  runAgent,
  cancelAgentRun,
  undoAgentRun,
  getAgentRuns,
} from "../ai/agent.js";

${helpers}

/**
 * Routes not yet migrated to feature routers.
 * Remove handlers here as you move them to controllers + routes/*.routes.js
 */
export function registerLegacyRoutes(ctx) {
  const { app, io } = ctx;

${routes}

  io.use(socketAuthMiddleware);
  setupSocketEvents(io);
}
`;

const outPath = path.join(root, "backend/routes/legacy.routes.js");
fs.writeFileSync(outPath, header);
console.log("Wrote", outPath, `(${header.split("\n").length} lines)`);
