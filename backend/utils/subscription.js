import User from "../models/User.js";
import Project from "../models/Project.js";
import { normalizeContact } from "./helpers.js";

const ACTIVE_STATUSES = ["draft", "published", "in-progress"];

export function normalizePlan(plan) {
  return plan === "pro" ? "pro" : "free";
}

export async function getUserPlan(contact) {
  const user = await User.findOne({ contact: normalizeContact(contact) }).lean();
  return normalizePlan(user?.plan);
}

export async function countActiveProjects(ownerContact) {
  return Project.countDocuments({
    ownerContact: normalizeContact(ownerContact),
    status: { $in: ACTIVE_STATUSES },
  });
}

export function countTeamMembers(project) {
  return (project.teamMembers || []).filter((m) => m.status === "joined").length;
}

export async function assertCanCreateProject(ownerContact) {
  const plan = await getUserPlan(ownerContact);
  if (plan === "pro") return;

  const count = await countActiveProjects(ownerContact);
  if (count >= 2) {
    const err = new Error(
      "Free plan includes 2 active projects. Upgrade to Pro for unlimited projects."
    );
    err.code = "PLAN_LIMIT";
    throw err;
  }
}

export async function assertCanAddTeamMember(_project) {
  /* Free and Pro: unlimited team members per project */
}

export function assertProFeature(plan, featureLabel) {
  if (plan === "pro") return;
  const err = new Error(
    `${featureLabel} is a Pro feature. Upgrade to unlock AI tools and priority matching.`
  );
  err.code = "PLAN_LIMIT";
  throw err;
}
