/** IST date string YYYY-MM-DD */
export function getISTDateString(date = new Date()) {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function getISTDateLabel(date = new Date()) {
  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getActiveMemberContacts(project) {
  const contacts = new Set();
  if (project.ownerContact) contacts.add(project.ownerContact.toLowerCase());
  for (const m of project.teamMembers || []) {
    if (m.status === "joined" && m.contact) {
      contacts.add(m.contact.toLowerCase());
    }
  }
  return [...contacts];
}

export function formatStandupMessage(name, yesterday, today, blockers) {
  const lines = [
    `📋 **Daily Standup — ${name}**`,
    `**Yesterday:** ${yesterday || "—"}`,
    `**Today:** ${today || "—"}`,
    `**Blockers:** ${blockers || "None"}`,
  ];
  return lines.join("\n");
}

export function formatStandupSummaryText(dateLabel, responses) {
  const lines = [`📋 Standup Summary — ${dateLabel}`];
  const blockers = [];

  for (const r of responses) {
    if (r.skipped) {
      lines.push(`**${r.name || r.contact}**: skipped standup today`);
      continue;
    }
    const worked = r.yesterday || "—";
    const willDo = r.today || "—";
    lines.push(`**${r.name || r.contact}**: worked on ${worked}, will do ${willDo}`);
    if (r.blockers && r.blockers.trim() && r.blockers.toLowerCase() !== "none") {
      blockers.push(`${r.name || r.contact}: ${r.blockers.trim()}`);
    }
  }

  lines.push(`**Blockers:** ${blockers.length ? blockers.join("; ") : "none"}`);
  return lines.join("\n");
}

export const DEV_SMART_TASKS = [
  {
    title: "Define this week's sprint goal",
    description: "Pick one measurable outcome the team can ship in 7 days.",
    suggestedAssignee: "",
    priority: "high",
  },
  {
    title: "Review open bugs from user feedback",
    description: "Triage the top 3 reported issues and assign owners.",
    suggestedAssignee: "",
    priority: "high",
  },
  {
    title: "Update project README",
    description: "Document setup steps so new members can contribute in under 30 minutes.",
    suggestedAssignee: "",
    priority: "medium",
  },
  {
    title: "Schedule a 30-min team sync",
    description: "Align on priorities and unblock anyone waiting on decisions.",
    suggestedAssignee: "",
    priority: "medium",
  },
  {
    title: "Post a progress update in Project Feed",
    description: "Share what shipped this week to keep momentum visible.",
    suggestedAssignee: "",
    priority: "low",
  },
];

export function buildSmartTasksPrompt(context = {}) {
  return `Suggest exactly 5 specific, actionable tasks for this startup project. Return ONLY valid JSON (no markdown):
{"tasks":[{"title":"...","description":"...","suggestedAssignee":"team member name or email","priority":"high|medium|low"}]}

Project: ${context.projectName || "Untitled"}
Description: ${context.description || "None"}
Team skills: ${(context.teamSkills || []).flat().join(", ") || "Not specified"}
Current stage: ${context.currentStage || "idea"}
Journey completion: ${context.completionPercent ?? 0}%
Open tasks: ${context.openTaskCount ?? 0}

Match suggestedAssignee to a team member when their skills fit. Keep titles under 80 chars.`;
}

export function buildExtractTasksPrompt(notesContent) {
  return `Extract all action items and tasks from these meeting notes. Return ONLY valid JSON (no markdown):
{"tasks":[{"task":"...","assignee":"name or empty","dueDate":"e.g. Friday or 2026-06-10","priority":"high|medium|low"}]}

Meeting notes:
${notesContent}`;
}

export function parseJsonTasks(text, key = "tasks") {
  if (!text) return [];
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed[key]) ? parsed[key] : [];
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return [];
    try {
      const parsed = JSON.parse(match[0]);
      return Array.isArray(parsed[key]) ? parsed[key] : [];
    } catch {
      return [];
    }
  }
}

export async function generateStandupSummaryAI(groq, model, responses, projectName) {
  const dateLabel = getISTDateLabel();
  const fallback = formatStandupSummaryText(dateLabel, responses);

  if (!groq) return fallback;

  const payload = responses.map((r) => ({
    name: r.name || r.contact,
    skipped: r.skipped,
    yesterday: r.yesterday,
    today: r.today,
    blockers: r.blockers,
  }));

  try {
    const completion = await groq.chat.completions.create({
      model,
      max_tokens: 600,
      messages: [
        {
          role: "system",
          content:
            "You summarize daily standups for a student startup team. Be concise. Use the exact format requested.",
        },
        {
          role: "user",
          content: `Summarize this standup for project "${projectName}" on ${dateLabel}.

Responses: ${JSON.stringify(payload)}

Format exactly like:
📋 Standup Summary — ${dateLabel}
[Member 1]: worked on X, will do Y
[Member 2]: worked on A, will do B
Blockers: none (or list them)

Use member names. One line per member who submitted. For skipped members say "skipped standup today".`,
        },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}

export function parseGithubRepo(url) {
  if (!url) return null;
  const match = String(url).match(/github\.com\/([^/]+)\/([^/?#]+)/i);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/i, ""),
  };
}
