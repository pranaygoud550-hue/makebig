import AIChatHistory from "../models/AIChatHistory.js";
import { normalizeContact } from "../utils/helpers.js";

export const MAX_STORED_AI_MESSAGES = 150;

export function getAIChatThreadKey({ projectId, advisorMode }) {
  if (advisorMode || projectId === "advisor") return "advisor";
  const id = String(projectId || "").trim();
  return id ? `project:${id}` : "";
}

export function sanitizeStoredMessages(messages = []) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => m && m.role && String(m.content || "").trim())
    .map((m) => ({
      id: String(m.id || `m-${m.ts || Date.now()}`),
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 32_000),
      action: m.action ? String(m.action).slice(0, 64) : "",
      devMode: Boolean(m.devMode),
      ts: Number(m.ts) || Date.now(),
      ...(m.linkMeta?.url
        ? {
            linkMeta: {
              url: String(m.linkMeta.url).slice(0, 2048),
              title: String(m.linkMeta.title || "").slice(0, 500),
              domain: String(m.linkMeta.domain || "").slice(0, 255),
            },
          }
        : {}),
      ...(m.github ? { github: m.github } : {}),
      ...(m.isLinkRead ? { isLinkRead: true } : {}),
    }))
    .slice(-MAX_STORED_AI_MESSAGES);
}

export async function loadAIChatHistory(contact, threadKey) {
  const normalized = normalizeContact(contact);
  const key = String(threadKey || "").trim();
  if (!normalized || !key) return [];

  const doc = await AIChatHistory.findOne({ contact: normalized, threadKey: key }).lean();
  return sanitizeStoredMessages(doc?.messages || []);
}

export async function saveAIChatHistory({
  contact,
  threadKey,
  projectId = "",
  advisorMode = false,
  messages = [],
}) {
  const normalized = normalizeContact(contact);
  const key = String(threadKey || "").trim();
  if (!normalized || !key) {
    return { ok: false, error: "contact and threadKey required" };
  }

  const stored = sanitizeStoredMessages(messages);
  await AIChatHistory.findOneAndUpdate(
    { contact: normalized, threadKey: key },
    {
      contact: normalized,
      threadKey: key,
      projectId: String(projectId || "").slice(0, 64),
      advisorMode: Boolean(advisorMode),
      messages: stored,
    },
    { upsert: true, new: true }
  );

  return { ok: true, count: stored.length };
}
