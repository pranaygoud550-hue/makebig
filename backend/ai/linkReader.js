import * as cheerio from "cheerio";
import fetch from "node-fetch";
import LinkHistory from "../models/LinkHistory.js";
import User from "../models/User.js";
import Profile from "../models/Profile.js";
import { getUserPlan } from "../utils/subscription.js";
import { normalizeContact } from "../utils/helpers.js";
import {
  isAnthropicConfigured,
  isGroqConfigured,
  streamGroqReply,
  streamAnthropicReply,
  streamDemoText,
} from "./cofounder.js";

export const FREE_LINK_READS_PER_DAY = 10;
const MAX_CONTENT_CHARS = 8000;
const MAX_URL_LENGTH = 500;

function isPrivateIPv4(hostname) {
  const m = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export function validateLinkUrl(urlString) {
  if (!urlString || typeof urlString !== "string") {
    return { ok: false, error: "URL required" };
  }
  const trimmed = urlString.trim();
  if (trimmed.length > MAX_URL_LENGTH) {
    return { ok: false, error: "URL too long (max 500 characters)" };
  }
  if (/^file:/i.test(trimmed)) {
    return { ok: false, error: "File URLs are not allowed" };
  }

  let url;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false, error: "Invalid URL" };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return { ok: false, error: "Invalid URL protocol" };
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return { ok: false, error: "Local or internal URLs are not allowed" };
  }
  if (isPrivateIPv4(hostname)) {
    return { ok: false, error: "Private IP addresses are not allowed" };
  }

  return { ok: true, url: url.href };
}

export function parseGitHubUrl(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (!host.includes("github.com")) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, "");

  if (parts[2]?.toLowerCase() === "blob" && parts.length >= 5) {
    return { owner, repo, readmePath: parts.slice(4).join("/") };
  }
  if (parts[2]?.toLowerCase() === "raw" && parts.length >= 5) {
    return { owner, repo, readmePath: parts.slice(4).join("/") };
  }
  if (parts[2]?.toLowerCase() === "readme.md") {
    return { owner, repo, readmePath: "README.md" };
  }

  return { owner, repo, readmePath: null };
}

function truncateContent(text, max = MAX_CONTENT_CHARS) {
  const cleaned = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max)}…`;
}

async function fetchRawReadme(owner, repo, readmePath) {
  const path = readmePath || "README.md";
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path}`;
  const res = await fetch(rawUrl, {
    headers: { "User-Agent": "MakeBig-LinkReader/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return "";
  return res.text();
}

async function fetchGitHubRepoContent(originalUrl, gh) {
  const headers = {
    "User-Agent": "MakeBig-LinkReader/1.0",
    Accept: "application/vnd.github+json",
  };

  const [repoRes, readmeRes, commitsRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${gh.owner}/${gh.repo}`, { headers }),
    fetch(`https://api.github.com/repos/${gh.owner}/${gh.repo}/readme`, {
      headers: { ...headers, Accept: "application/vnd.github.raw" },
    }),
    fetch(`https://api.github.com/repos/${gh.owner}/${gh.repo}/commits?per_page=5`, {
      headers,
    }),
  ]);

  if (!repoRes.ok) {
    throw new Error("I couldn't access that link. It might be private or blocked.");
  }

  const repo = await repoRes.json();
  let readmeText = "";
  if (readmeRes.ok) {
    readmeText = await readmeRes.text();
  } else if (gh.readmePath) {
    readmeText = await fetchRawReadme(gh.owner, gh.repo, gh.readmePath);
  } else {
    readmeText = await fetchRawReadme(gh.owner, gh.repo, "README.md");
  }

  let commits = [];
  if (commitsRes.ok) {
    commits = await commitsRes.json();
  }

  const lastCommit = commits[0]?.commit;
  const content = truncateContent(
    [repo.description, readmeText].filter(Boolean).join("\n\n")
  );

  return {
    title: repo.full_name || `${gh.owner}/${gh.repo}`,
    description: repo.description || "",
    content,
    url: originalUrl,
    github: {
      name: repo.full_name || `${gh.owner}/${gh.repo}`,
      stars: repo.stargazers_count ?? 0,
      forks: repo.forks_count ?? 0,
      language: repo.language || "Unknown",
      lastCommitMessage: lastCommit?.message?.split("\n")[0] || "",
      lastCommitDate: lastCommit?.author?.date ? new Date(lastCommit.author.date) : null,
    },
  };
}

async function fetchWebPage(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "MakeBig-LinkReader/1.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error("I couldn't access that link. It might be private or blocked.");
  }

  const contentType = res.headers.get("content-type") || "";
  const body = await res.text();

  if (contentType.includes("text/plain") || /\.md($|\?)/i.test(url)) {
    return {
      title: new URL(url).pathname.split("/").pop() || url,
      description: "",
      content: truncateContent(body),
      url,
    };
  }

  const $ = cheerio.load(body);
  $("script, style, nav, footer, noscript, iframe").remove();

  const title =
    $("title").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") ||
    $("h1").first().text().trim() ||
    url;
  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";

  const chunks = [];
  $("h1, h2, h3").each((_, el) => {
    const t = $(el).text().trim();
    if (t) chunks.push(t);
  });
  $("p").each((_, el) => {
    const t = $(el).text().trim();
    if (t) chunks.push(t);
  });
  $("li").each((_, el) => {
    const t = $(el).text().trim();
    if (t) chunks.push(`• ${t}`);
  });
  $("pre, code").each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 20) chunks.push(t);
  });

  const content = truncateContent(
    [description, ...chunks].filter(Boolean).join("\n\n")
  );

  return { title, description, content, url };
}

export async function fetchLinkContent(urlString) {
  const validation = validateLinkUrl(urlString);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const gh = parseGitHubUrl(validation.url);
  if (gh) {
    return fetchGitHubRepoContent(validation.url, gh);
  }

  return fetchWebPage(validation.url);
}

export async function getProjectLinkContext(project) {
  const contacts = [
    project.ownerContact,
    ...(project.teamMembers || [])
      .filter((m) => m.status === "joined")
      .map((m) => m.contact),
  ]
    .filter(Boolean)
    .map(normalizeContact);

  const [users, profiles] = await Promise.all([
    User.find({ contact: { $in: contacts } })
      .select("name contact skills verifiedSkills")
      .lean(),
    Profile.find({ contact: { $in: contacts } })
      .select("contact skills headline")
      .lean(),
  ]);

  const profileMap = Object.fromEntries(profiles.map((p) => [normalizeContact(p.contact), p]));
  const skillSet = new Set(project.roles || []);

  for (const u of users) {
    (u.skills || []).forEach((s) => skillSet.add(s));
    (u.verifiedSkills || []).forEach((s) => skillSet.add(typeof s === "string" ? s : s.skill));
    const prof = profileMap[normalizeContact(u.contact)];
    (prof?.skills || []).forEach((s) => skillSet.add(s));
  }

  const stage = project.journey?.currentStage || project.status || "idea";

  return {
    projectName: project.name,
    description: project.desc || project.description || "No description",
    skills: [...skillSet].filter(Boolean).slice(0, 30).join(", ") || "Not specified",
    stage,
  };
}

export function buildLinkReaderPrompt({
  projectName,
  description,
  skills,
  stage,
  url,
  title,
  pageContent,
  question,
}) {
  const userQuestion =
    question?.trim() ||
    "What should our team do with this information?";

  return `You are an AI co-founder advisor for a student startup called ${projectName}.
Project description: ${description}
Team skills: ${skills}
Current stage: ${stage}

The team shared this link: ${url}
Page title: ${title}
Page content: ${pageContent}

User question: ${userQuestion}

Give specific, actionable advice for THIS specific startup based on what you just read. Be direct and practical. Max 300 words.`;
}

export async function streamLinkReaderAdvice({ prompt, onDelta }) {
  const history = [{ role: "user", content: prompt }];
  const systemPrompt =
    "You are a practical AI co-founder for Indian student startups. Be direct, specific, and actionable.";

  if (isAnthropicConfigured()) {
    const result = await streamAnthropicReply({ systemPrompt, history, onDelta });
    return { ...result, devMode: false };
  }

  if (isGroqConfigured()) {
    try {
      const result = await streamGroqReply({ systemPrompt, history, onDelta });
      return { ...result, devMode: false };
    } catch (error) {
      const hint = error instanceof Error ? error.message : "AI unavailable";
      const devText = `**AI unavailable** — ${hint}\n\nReview the link with your team and note 3 takeaways for ${prompt.match(/called ([^.]+)/)?.[1] || "your project"}.`;
      await streamDemoText(devText, onDelta);
      return { outputText: devText, provider: "demo", devMode: true };
    }
  }

  const devText =
    "**Demo mode** — Add GROQ_API_KEY or ANTHROPIC_API_KEY to get link-specific advice.\n\n" +
    "For now: skim the page as a team, list 3 relevant ideas for your startup, and assign one owner to follow up this week.";
  await streamDemoText(devText, onDelta);
  return { outputText: devText, provider: "demo", devMode: true };
}

function startOfTodayUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function countProjectLinkReadsToday(projectId) {
  return LinkHistory.countDocuments({
    projectId,
    readAt: { $gte: startOfTodayUTC() },
  });
}

export async function getLinkReadUsage(project) {
  const plan = await getUserPlan(project.ownerContact);
  const used = await countProjectLinkReadsToday(project._id);
  if (plan === "pro") {
    return { used, limit: null, isPro: true, remaining: null };
  }
  return {
    used,
    limit: FREE_LINK_READS_PER_DAY,
    isPro: false,
    remaining: Math.max(0, FREE_LINK_READS_PER_DAY - used),
  };
}

export async function assertLinkReadQuota(project) {
  const usage = await getLinkReadUsage(project);
  if (usage.isPro || usage.used < FREE_LINK_READS_PER_DAY) {
    return usage;
  }
  const err = new Error(
    "Your team has used all 10 link reads for today. Resets at midnight. Upgrade to Pro for unlimited."
  );
  err.code = "LINK_READ_LIMIT";
  err.usage = usage;
  throw err;
}

export async function saveLinkHistory({
  projectId,
  url,
  title,
  question,
  response,
  readBy,
  github,
}) {
  const summary = String(response || "").slice(0, 100);
  return LinkHistory.create({
    projectId,
    url,
    title,
    question: question || "",
    response,
    summary,
    readBy: normalizeContact(readBy),
    readAt: new Date(),
    githubMeta: github
      ? {
          name: github.name,
          stars: github.stars,
          forks: github.forks,
          language: github.language,
          lastCommitMessage: github.lastCommitMessage,
          lastCommitDate: github.lastCommitDate,
        }
      : undefined,
  });
}

export async function getProjectLinkHistory(projectId, limit = 20) {
  const links = await LinkHistory.find({ projectId })
    .sort({ readAt: -1 })
    .limit(limit)
    .lean();

  return links.map((l) => ({
    id: l._id.toString(),
    url: l.url,
    title: l.title,
    question: l.question,
    summary: l.summary || String(l.response || "").slice(0, 100),
    response: l.response,
    readAt: l.readAt,
    readBy: l.readBy,
    github: l.githubMeta || null,
  }));
}
