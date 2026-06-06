import Project from "../models/Project.js";
import User from "../models/User.js";
import { isProjectMember, isProjectOwner } from "../middleware/security.js";
import { normalizeContact } from "../utils/helpers.js";

export function getSocketUser(socket) {
  const contact = normalizeContact(socket.user?.contact || "");
  const userId = String(socket.user?.userId || "").trim();
  if (!contact) return null;
  return { contact, userId: userId || contact };
}

export function socketAuthError(socket, message) {
  socket.emit("error", { message });
}

export function requireSocketUser(socket) {
  const user = getSocketUser(socket);
  if (!user) {
    socketAuthError(socket, "Authentication required");
    return null;
  }
  return user;
}

export async function loadProjectById(projectId) {
  if (!projectId) return null;
  try {
    return await Project.findById(projectId).lean();
  } catch {
    return null;
  }
}

export async function requireSocketProjectMember(socket, projectId) {
  const user = requireSocketUser(socket);
  if (!user) return null;

  if (!projectId) {
    socketAuthError(socket, "Project required");
    return null;
  }

  const project = await loadProjectById(projectId);
  if (!project) {
    socketAuthError(socket, "Project not found");
    return null;
  }

  if (!isProjectMember(project, user.contact)) {
    socketAuthError(socket, "You must join this project first");
    return null;
  }

  return { user, project };
}

export async function requireSocketProjectOwner(socket, projectId) {
  const ctx = await requireSocketProjectMember(socket, projectId);
  if (!ctx) return null;

  if (!isProjectOwner(ctx.project, ctx.user.contact)) {
    socketAuthError(socket, "Only the project owner can do this");
    return null;
  }

  return ctx;
}

export async function displayNameForSocketUser(contact) {
  const user = await User.findOne({ contact: normalizeContact(contact) }).lean();
  return user?.name || contact;
}
