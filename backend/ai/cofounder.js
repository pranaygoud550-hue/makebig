import Anthropic from "@anthropic-ai/sdk";
import Groq from "groq-sdk";

export const CONTEXT_WINDOW = 200_000;
export const MAX_HISTORY_MESSAGES = 10;
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
export const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const CATEGORY_CONTEXT = {
  tech: "software / app development startup",
  design: "design / branding / UX project",
  marketing: "marketing / growth / social media project",
  content: "content creation / writing / video project",
  finance: "fintech / finance / business project",
  education: "edtech / tutoring / learning platform",
  health: "healthtech / wellness / medical project",
  social: "social impact / NGO / community project",
  other: "general project",
};

const DEV_RESPONSES = {
  "suggest-tasks": `Here are 6 tasks to move your project forward:\n\n• **Set up a shared workspace** — Create a Notion/Trello board with project goals, deadlines, and task ownership.\n• **Write a 1-page project brief** — Name, problem, solution, target user, and 30-day success criteria.\n• **Find your first 3 real users** — Talk to strangers who have the problem you're solving.\n• **Build the smallest possible demo** — Figma mockup, landing page, or 2-minute walkthrough.\n• **Post your first project update** — Use the Project Feed to attract teammates.\n• **Set a weekly sync** — 30 minutes every Sunday. Projects die from poor communication.`,
  "draft-dm": `Here's a cold DM you can send:\n\n---\n\nHey [Name], I saw your work in [their skill]. I'm building [project name] — [one sentence on impact].\n\nWe're a small team working on this seriously. Your [skill] would help with [specific part].\n\nOpen to a 20-min call this week?\n\n---`,
  "generate-pitch": `**The Problem:** [Specific frustration your user has]\n\n**What we're building:** [Project name] is [one-line description]. Unlike [alternative], we [differentiator]. Focused on [user group] in India.\n\n**Where we are:** Early stage. Looking for [skill 1] and [skill 2] who want to build something real.`,
  "check-health": null,
};

export function isAnthropicConfigured() {
  const key = process.env.ANTHROPIC_API_KEY || "";
  if (!key.trim()) return false;
  const weak = ["your_", "REPLACE", "generate_random"];
  return key.startsWith("sk-ant") && !weak.some((w) => key.includes(w));
}

export function isGroqConfigured() {
  const key = process.env.GROQ_API_KEY || "";
  if (!key.trim()) return false;
  const weak = ["your_", "your_groq", "REPLACE", "generate_random"];
  return !weak.some((w) => key.includes(w));
}

/** Rough token estimate (~4 chars per token). */
export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function buildSystemPrompt(project) {
  const catCtx = CATEGORY_CONTEXT[project.categoryId] || "project";
  const cityCtx = project.city
    ? `, based in ${project.city}, ${project.state || "India"}`
    : ", India";
  return `You are an expert AI co-founder and advisor for "Make Big" — India's student collaboration platform. You are helping a college student run their ${catCtx} called "${project.name}"${cityCtx}.

Project description: ${project.desc || "No description provided."}
Skills they need: ${(project.roles || []).join(", ") || "Not specified"}
Monthly budget: ${project.salaryMax ? `₹${project.salaryMax.toLocaleString()}/mo` : "Not specified"}

Your tone is direct, practical, encouraging, and tailored for Indian college students. Give concrete advice, not vague platitudes. Keep responses concise and actionable (max 300 words unless generating a pitch or DM). Use bullet points when listing items. Never use corporate buzzwords. Sound like a smart co-founder, not a consultant.`;
}

export function buildActionUserMessage(action, context = {}, project = null) {
  if (action === "suggest-tasks") {
    const existingTasks =
      (project?.tasks || []).map((t) => t.title).join(", ") || "none yet";
    return `Suggest 6–8 specific, actionable next tasks for my project. Current tasks: ${existingTasks}. Focus on tasks that drive real progress, not busywork. Format each as: **Task title** — why it matters (one sentence).`;
  }
  if (action === "draft-dm") {
    const {
      targetName = "the person",
      targetSkill = "their skills",
      targetRole = "team member",
    } = context;
    return `Draft a short, genuine cold DM (3–5 sentences) to invite ${targetName} — who has ${targetSkill} — to join my project as a ${targetRole}. Don't be generic. Make it specific to my project. Include a clear call-to-action.`;
  }
  if (action === "generate-pitch") {
    return `Generate a compelling 3-paragraph pitch for my project. Structure: (1) The problem/opportunity, (2) What we're building and our unique angle, (3) Who we're looking for and why join now. After the pitch, add 3 bullet points of "why join us now" hooks.`;
  }
  if (action === "validate-idea") {
    return `Validate my project idea for "${project?.name || "this project"}". Be direct: what's genuinely strong, what's weak, and what would make a skeptical mentor invest time in it? Give a verdict in one line, then 3 concrete improvements.`;
  }
  if (action === "target-user") {
    return `Who is my target user for "${project?.name || "this project"}"? Define a specific persona (age, context, pain, where they hang out online/offline in India). Avoid generic "everyone" answers.`;
  }
  if (action === "build-first") {
    return `What should I build first for "${project?.name || "this project"}"? Give me a 2-week MVP scope: 3 features max, what to skip, and the single demo that proves the idea works.`;
  }
  if (action === "biggest-risk") {
    return `What's the biggest risk that could kill "${project?.name || "this project"}" in the next 30 days? Rank top 3 risks and one mitigation action for each.`;
  }
  if (action === "check-health") {
    const totalTasks = (project?.tasks || []).length;
    const doneTasks = (project?.tasks || []).filter((t) => t.status === "done").length;
    const teamCount = (project?.teamMembers || []).filter((m) => m.status === "joined").length;
    const completionPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const daysSinceCreate = project?.createdAt
      ? Math.floor((Date.now() - new Date(project.createdAt)) / 86400000)
      : 0;
    return `Assess my project's health and give a direct diagnosis + 3 specific actions for this week:

- Project age: ${daysSinceCreate} days old
- Team members: ${teamCount} joined
- Tasks: ${doneTasks}/${totalTasks} done (${completionPct}% complete)

Start with: 🟢 Healthy / 🟡 Slowing / 🔴 Stalling — one sentence why. Then 3 actions.`;
  }
  return String(context.message || "").trim();
}

export function normalizeHistory(messages = []) {
  return messages
    .filter((m) => m?.role && m?.content?.trim())
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content).trim(),
    }));
}

export function computeContextUsage(systemPrompt, history, outputText = "") {
  const inputTokens =
    estimateTokens(systemPrompt) +
    history.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  const outputTokens = estimateTokens(outputText);
  const totalUsed = inputTokens + outputTokens;
  return {
    inputTokens,
    outputTokens,
    totalUsed,
    percent: Math.min(100, Math.round((totalUsed / CONTEXT_WINDOW) * 100)),
  };
}

export function getDevModeResponse(action, context, project) {
  if (action === "check-health" && project) {
    const daysSinceCreate = Math.floor(
      (Date.now() - new Date(project.createdAt)) / 86400000
    );
    const totalTasks = (project.tasks || []).length;
    const doneTasks = (project.tasks || []).filter((t) => t.status === "done").length;
    const teamCount = (project.teamMembers || []).filter((m) => m.status === "joined").length;
    const isStalling = daysSinceCreate > 7 && teamCount < 2 && doneTasks === 0;
    return `**${isStalling ? "🔴 Stalling" : teamCount > 1 ? "🟢 Healthy" : "🟡 Slowing"}** — ${
      isStalling ? "no team and no task progress" : "early stage, some momentum"
    }.

• **Get 1 more person on the team today** — Post in college groups with your 1-sentence pitch.
• **Create your first 3 tasks** — Dashboard → Overview → New Task.
• **Post a project update in the Feed** — Visibility attracts collaborators.

_Add ANTHROPIC_API_KEY or GROQ_API_KEY to .env and restart the server for live AI._`;
  }
  if (action === "custom") {
    const msg = String(context.message || "").trim();
    return `**Demo mode** — add \`ANTHROPIC_API_KEY\` or \`GROQ_API_KEY\` to \`.env\` and restart \`npm run dev\`.\n\nYour question: _"${msg}"_\n\nThen I'll answer with full context about **${project?.name || "your project"}**.`;
  }
  return (
    DEV_RESPONSES[action] ||
    "Demo mode — add your API key to enable live AI responses."
  );
}

/** Simulate streaming for demo mode (word-by-word). */
export async function streamDemoText(text, onDelta) {
  const words = text.split(/(\s+)/);
  for (const word of words) {
    onDelta(word);
    await new Promise((r) => setTimeout(r, 18));
  }
}

export async function streamAnthropicReply({ systemPrompt, history, onDelta }) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const stream = anthropic.messages.stream({
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: history.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  let outputText = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
      const text = event.delta.text || "";
      outputText += text;
      onDelta(text);
    }
  }

  const finalMessage = await stream.finalMessage();
  const usage = finalMessage?.usage;
  return {
    outputText,
    provider: "anthropic",
    usage: usage
      ? {
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
        }
      : null,
  };
}

export async function streamGroqReply({ systemPrompt, history, onDelta }) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const stream = await groq.chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: 1024,
    stream: true,
    messages: [{ role: "system", content: systemPrompt }, ...history],
  });

  let outputText = "";
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || "";
    if (text) {
      outputText += text;
      onDelta(text);
    }
  }
  return { outputText, provider: "groq", usage: null };
}

export async function streamCofounderReply({
  project,
  history,
  action,
  context,
  onDelta,
}) {
  const systemPrompt = buildSystemPrompt(project);
  let messages = normalizeHistory(history);

  if (action && action !== "custom") {
    const actionMsg = buildActionUserMessage(action, context, project);
    messages = [...messages, { role: "user", content: actionMsg }];
  } else if (action === "custom") {
    const msg = String(context?.message || "").trim();
    if (!msg) throw new Error("message required");
    if (!messages.length || messages[messages.length - 1].content !== msg) {
      messages = [...messages, { role: "user", content: msg }];
    }
  }

  if (!messages.length) {
    throw new Error("No messages to send");
  }

  if (isAnthropicConfigured()) {
    const result = await streamAnthropicReply({ systemPrompt, history: messages, onDelta });
    const usage = result.usage || {
      inputTokens: estimateTokens(systemPrompt) + messages.reduce((s, m) => s + estimateTokens(m.content), 0),
      outputTokens: estimateTokens(result.outputText),
    };
    return { ...result, devMode: false, usage };
  }

  if (isGroqConfigured()) {
    const result = await streamGroqReply({ systemPrompt, history: messages, onDelta });
    const usage = {
      inputTokens: estimateTokens(systemPrompt) + messages.reduce((s, m) => s + estimateTokens(m.content), 0),
      outputTokens: estimateTokens(result.outputText),
    };
    return { ...result, devMode: false, usage };
  }

  const devText = getDevModeResponse(action || "custom", context, project);
  await streamDemoText(devText, onDelta);
  const usage = {
    inputTokens: estimateTokens(systemPrompt),
    outputTokens: estimateTokens(devText),
  };
  return { outputText: devText, provider: "demo", devMode: true, usage };
}
