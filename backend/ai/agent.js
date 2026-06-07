import Groq from "groq-sdk";
import AgentRun from "../models/AgentRun.js";
import Build from "../models/Build.js";
import User from "../models/User.js";
import StandupLog from "../models/StandupLog.js";
import { isGroqConfigured, GROQ_MODEL } from "./cofounder.js";
import { normalizeContact } from "../utils/helpers.js";
import { computeProjectHealth } from "../utils/ecosystem.js";
import Project from "../models/Project.js";
import Post from "../models/Post.js";
import Activity from "../models/Activity.js";

const runningAgents = new Map();

export function cancelAgentRun(runId) {
  const ctrl = runningAgents.get(String(runId));
  if (ctrl) {
    ctrl.cancelled = true;
    return true;
  }
  return false;
}

async function callGroqJson(prompt, fallback) {
  if (!isGroqConfigured()) return fallback;
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 2000,
    });
    const text = completion.choices[0]?.message?.content || "";
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return JSON.parse(match ? match[0] : text);
  } catch {
    return fallback;
  }
}

async function callGroqText(prompt, fallback) {
  if (!isGroqConfigured()) return fallback;
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 800,
    });
    return completion.choices[0]?.message?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function projectRoom(projectId) {
  return `project_${projectId}`;
}

async function saveStep(runId, stepPayload) {
  await AgentRun.updateOne(
    { _id: runId },
    {
      $push: {
        steps: {
          ...stepPayload,
          completedAt: new Date(),
        },
      },
    }
  );
}

function demoDescription(project, goal) {
  return `${project.name} helps students solve real problems — ${goal.replace(/\.$/, "")}. We're building for Indian college campuses with a focus on speed, affordability, and team collaboration on Make Big.`;
}

function demoRoles(categoryId) {
  const map = {
    tech: ["React Developer", "Backend Engineer", "UI/UX Designer", "Product Manager", "DevOps"],
    design: ["UI/UX Designer", "Brand Designer", "Motion Designer", "Frontend Developer"],
    marketing: ["Growth Marketer", "Content Writer", "Social Media Manager", "SEO Specialist"],
  };
  return map[categoryId] || ["Full-stack Developer", "UI/UX Designer", "Marketing Lead", "Business Analyst", "Operations"];
}

function demoTasks(projectName) {
  return [
    { title: `Define MVP scope for ${projectName}`, priority: "high" },
    { title: "Interview 5 target users this week", priority: "high" },
    { title: "Set up shared task board with owners", priority: "medium" },
    { title: "Create a simple landing page", priority: "medium" },
    { title: "Post first project update on Make Big feed", priority: "medium" },
    { title: "Schedule weekly team sync (30 min)", priority: "low" },
    { title: "Document problem statement in 1 page", priority: "high" },
    { title: "Identify 3 competitors and note gaps", priority: "medium" },
  ];
}

async function pushTasks(project, tasks, createdBy, emit, runId, undo) {
  const created = [];
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    if (runningAgents.get(String(runId))?.cancelled) break;
    emit({
      step: 0,
      action: "tasks_progress",
      status: "running",
      data: { current: i + 1, total: tasks.length, title: t.title },
    });
    project.tasks.push({
      title: t.title,
      description: t.description || "",
      priority: t.priority || "medium",
      assignee: t.assignee || "",
      status: "todo",
      createdBy,
      createdAt: new Date(),
    });
    await sleep(200);
  }
  await project.save();
  for (const task of project.tasks.slice(-tasks.length)) {
    const id = task._id.toString();
    undo.taskIds.push(id);
    created.push({ ...task.toObject(), id });
    emit({
      step: 0,
      action: "task_created",
      status: "done",
      data: { task: { ...task.toObject(), id } },
    });
  }
  return created;
}

export async function runSetupAgent({ io, projectId, goal, runId, userContact, pushNotification }) {
  const ctrl = { cancelled: false };
  runningAgents.set(String(runId), ctrl);
  const emit = (payload) => {
    io.to(projectRoom(projectId)).emit("agent_step", { ...payload, runId: String(runId) });
  };

  const project = await Project.findById(projectId);
  if (!project) throw new Error("Project not found");

  const undo = {
    desc: project.desc,
    roles: [...(project.roles || [])],
    pitch: project.pitch || "",
    journey: project.journey ? { ...project.journey.toObject?.() || project.journey } : null,
    milestones: [...(project.milestones || [])],
    taskIds: [],
    buildId: null,
    health: project.health ? { ...project.health.toObject?.() || project.health } : null,
  };

  // Step 1
  emit({
    step: 1,
    action: "reading_project",
    status: "done",
    data: {
      projectName: project.name,
      city: project.city,
      category: project.categoryId,
    },
  });
  await saveStep(runId, {
    step: 1,
    action: "reading_project",
    status: "done",
    summary: `${project.name}${project.city ? ` · ${project.city}` : ""}`,
    data: { projectName: project.name },
  });

  if (ctrl.cancelled) return;

  // Step 2 — description
  emit({ step: 2, action: "description_written", status: "running", data: {} });
  const descPrompt = `Write a compelling 2-3 sentence project description for a student startup.
Project: ${project.name}
Category: ${project.categoryId}
Goal: ${goal}
City: ${project.city || "India"}
Return ONLY the description text, no quotes.`;
  const description = await callGroqText(descPrompt, demoDescription(project, goal));
  project.desc = description.slice(0, 2000);
  await project.save();
  emit({
    step: 2,
    action: "description_written",
    status: "done",
    data: { description: project.desc },
  });
  await saveStep(runId, {
    step: 2,
    action: "description_written",
    status: "done",
    summary: project.desc.slice(0, 80),
    data: { description: project.desc },
  });

  // Step 3 — roles
  emit({ step: 3, action: "roles_created", status: "running", data: {} });
  const rolesData = await callGroqJson(
    `Suggest 4-5 team roles for startup "${project.name}" (${project.categoryId}). Goal: ${goal}. Return JSON: {"roles":["Role1","Role2",...]}`,
    { roles: demoRoles(project.categoryId) }
  );
  const roles = (rolesData.roles || demoRoles(project.categoryId)).slice(0, 6);
  project.roles = roles;
  await project.save();
  emit({ step: 3, action: "roles_created", status: "done", data: { roles } });
  await saveStep(runId, {
    step: 3,
    action: "roles_created",
    status: "done",
    summary: roles.slice(0, 3).join(" · "),
    data: { roles },
  });

  // Step 4 — tasks
  emit({ step: 4, action: "tasks_created", status: "running", data: { count: 0, total: 8 } });
  const tasksData = await callGroqJson(
    `Create exactly 8 specific startup tasks for "${project.name}". Goal: ${goal}. Return JSON: {"tasks":[{"title":"...","priority":"high|medium|low"}]}`,
    { tasks: demoTasks(project.name) }
  );
  const taskList = (tasksData.tasks || demoTasks(project.name)).slice(0, 8);
  const createdTasks = await pushTasks(project, taskList, userContact, emit, runId, undo);
  emit({
    step: 4,
    action: "tasks_created",
    status: "done",
    data: { tasks: createdTasks, count: createdTasks.length },
  });
  await saveStep(runId, {
    step: 4,
    action: "tasks_created",
    status: "done",
    summary: `${createdTasks.length} tasks created`,
    data: { count: createdTasks.length },
  });

  // Step 5 — journey
  emit({ step: 5, action: "journey_set", status: "running", data: {} });
  const journeyData = await callGroqJson(
    `For startup "${project.name}" at goal "${goal}", pick journey stage (idea|research|prototype|mvp|beta|launch) and completionPercent 0-100. Return JSON: {"stage":"idea","completionPercent":15,"nextMilestone":"..."}`,
    { stage: "idea", completionPercent: 15, nextMilestone: "Validate with 10 users" }
  );
  project.journey = {
    currentStage: journeyData.stage || "idea",
    completionPercent: journeyData.completionPercent ?? 15,
    configured: true,
    nextMilestone: journeyData.nextMilestone || "Complete first user interviews",
    lastUpdated: new Date(),
  };
  await project.save();
  emit({
    step: 5,
    action: "journey_set",
    status: "done",
    data: {
      stage: project.journey.currentStage,
      completionPercent: project.journey.completionPercent,
    },
  });
  await saveStep(runId, {
    step: 5,
    action: "journey_set",
    status: "done",
    summary: `Stage: ${project.journey.currentStage}`,
    data: { stage: project.journey.currentStage, completionPercent: project.journey.completionPercent },
  });

  // Step 6 — pitch
  emit({ step: 6, action: "pitch_written", status: "running", data: {} });
  const pitch = await callGroqText(
    `Write a 3-sentence investor pitch for student startup "${project.name}": ${project.desc}. Be specific and concise.`,
    `${project.name} solves a painful problem for Indian college students. We combine ${roles[0] || "tech"} and ${roles[1] || "design"} to ship faster than solo founders. Join us now to build something real before graduation.`
  );
  project.pitch = pitch.slice(0, 1500);
  await project.save();
  emit({ step: 6, action: "pitch_written", status: "done", data: { pitch: project.pitch } });
  await saveStep(runId, {
    step: 6,
    action: "pitch_written",
    status: "done",
    summary: project.pitch.slice(0, 80),
    data: { pitch: project.pitch },
  });

  const summary = `Your project is set up! I created ${createdTasks.length} tasks, defined ${roles.length} roles, set your journey stage to ${project.journey.currentStage}, and wrote your pitch.`;

  emit({
    step: 7,
    action: "agent_summary",
    status: "done",
    data: { summary },
  });
  await saveStep(runId, {
    step: 7,
    action: "agent_summary",
    status: "done",
    summary,
    data: { summary },
  });

  await AgentRun.updateOne(
    { _id: runId },
    {
      $set: {
        status: "complete",
        summary,
        actionsCount: 6,
        undoSnapshot: undo,
        completedAt: new Date(),
      },
    }
  );

  io.to(projectRoom(projectId)).emit("agent_complete", {
    runId: String(runId),
    summary,
    actionsCount: 6,
    agentType: "setup",
  });

  runningAgents.delete(String(runId));
}

export async function runPlanAgent({ io, projectId, goal, runId, userContact, pushNotification }) {
  const ctrl = { cancelled: false };
  runningAgents.set(String(runId), ctrl);
  const emit = (payload) => {
    io.to(projectRoom(projectId)).emit("agent_step", { ...payload, runId: String(runId) });
  };

  const project = await Project.findById(projectId);
  if (!project) throw new Error("Project not found");

  const undo = {
    desc: project.desc,
    roles: [...(project.roles || [])],
    pitch: project.pitch || "",
    journey: project.journey ? { ...project.journey.toObject?.() || project.journey } : null,
    milestones: [...(project.milestones || [])],
    taskIds: [],
    buildId: null,
    health: project.health ? { ...project.health.toObject?.() || project.health } : null,
  };

  const health = await computeProjectHealth(Project, User, Post, Activity, projectId);
  const standups = await StandupLog.find({ projectId: project._id })
    .sort({ createdAt: -1 })
    .limit(14)
    .lean();
  const openTasks = (project.tasks || []).filter((t) => t.status !== "done").length;
  const doneTasks = (project.tasks || []).filter((t) => t.status === "done").length;

  emit({
    step: 1,
    action: "reading_project",
    status: "done",
    data: {
      projectName: project.name,
      openTasks,
      doneTasks,
      healthScore: health?.score ?? 0,
      standups: standups.length,
    },
  });
  await saveStep(runId, {
    step: 1,
    action: "reading_project",
    status: "done",
    summary: `${openTasks} open tasks · health ${health?.score ?? 0}`,
    data: { healthScore: health?.score },
  });

  emit({ step: 2, action: "gaps_analyzed", status: "running", data: {} });
  const gaps = await callGroqText(
    `Analyze gaps for startup "${project.name}". Open tasks: ${openTasks}, done: ${doneTasks}, health: ${health?.score}. Goal: ${goal}. List 3 gaps in bullet points.`,
    "• Task ownership is unclear\n• No weekly milestones set\n• Low standup participation"
  );
  emit({ step: 2, action: "gaps_analyzed", status: "done", data: { gaps } });
  await saveStep(runId, { step: 2, action: "gaps_analyzed", status: "done", summary: "Gaps identified", data: { gaps } });

  const contacts = [
    project.ownerContact,
    ...(project.teamMembers || []).filter((m) => m.status === "joined").map((m) => m.contact),
  ].filter(Boolean);
  const members = await User.find({ contact: { $in: contacts.map(normalizeContact) } })
    .select("name contact skills")
    .lean();
  const memberSkills = members
    .map((m) => `${m.name}: ${(m.skills || []).join(", ")}`)
    .join("; ");

  emit({ step: 3, action: "tasks_created", status: "running", data: {} });
  const planData = await callGroqJson(
    `Create a 2-week sprint with 6 tasks for "${project.name}". Team: ${memberSkills}. Goal: ${goal}. Return JSON: {"tasks":[{"title":"...","priority":"high|medium|low","assignee":"name or empty"}]}`,
    {
      tasks: [
        { title: "Sprint kickoff — align on 2-week goals", priority: "high", assignee: "" },
        { title: "Ship one user-facing improvement", priority: "high", assignee: "" },
        { title: "Run 3 user feedback calls", priority: "medium", assignee: "" },
        { title: "Close 2 overdue tasks", priority: "medium", assignee: "" },
        { title: "Post mid-sprint update on project feed", priority: "low", assignee: "" },
        { title: "Retrospective + plan next sprint", priority: "medium", assignee: "" },
      ],
    }
  );
  const createdTasks = await pushTasks(
    project,
    planData.tasks || [],
    userContact,
    emit,
    runId,
    undo
  );
  emit({
    step: 3,
    action: "tasks_created",
    status: "done",
    data: { tasks: createdTasks, count: createdTasks.length },
  });
  await saveStep(runId, {
    step: 3,
    action: "tasks_created",
    status: "done",
    summary: `${createdTasks.length} sprint tasks`,
    data: { count: createdTasks.length },
  });

  emit({ step: 4, action: "milestones_set", status: "running", data: {} });
  const now = Date.now();
  const milestones = [
    { title: "Week 1 checkpoint", date: new Date(now + 7 * 86400000) },
    { title: "MVP demo ready", date: new Date(now + 10 * 86400000) },
    { title: "Sprint review", date: new Date(now + 14 * 86400000) },
  ];
  project.milestones = milestones;
  await project.save();
  emit({ step: 4, action: "milestones_set", status: "done", data: { milestones } });
  await saveStep(runId, {
    step: 4,
    action: "milestones_set",
    status: "done",
    summary: "3 milestones set",
    data: { milestones },
  });

  emit({ step: 5, action: "team_notified", status: "running", data: {} });
  for (const c of contacts) {
    await pushNotification({
      contact: c,
      projectId: project._id,
      type: "project_update",
      title: "Sprint plan ready",
      message: "🤖 AI created a 2-week sprint plan for your team",
    });
  }
  emit({ step: 5, action: "team_notified", status: "done", data: { notified: contacts.length } });
  await saveStep(runId, {
    step: 5,
    action: "team_notified",
    status: "done",
    summary: `Notified ${contacts.length} members`,
    data: {},
  });

  const summary = `Sprint plan ready — ${createdTasks.length} tasks, 3 milestones, team notified.`;
  await AgentRun.updateOne(
    { _id: runId },
    {
      $set: {
        status: "complete",
        summary,
        actionsCount: 5,
        undoSnapshot: undo,
        completedAt: new Date(),
      },
    }
  );
  io.to(projectRoom(projectId)).emit("agent_complete", {
    runId: String(runId),
    summary,
    actionsCount: 5,
    agentType: "plan",
  });
  runningAgents.delete(String(runId));
}

export async function runBuildAgent({ io, projectId, goal, runId, userContact }) {
  const ctrl = { cancelled: false };
  runningAgents.set(String(runId), ctrl);
  const emit = (payload) => {
    io.to(projectRoom(projectId)).emit("agent_step", { ...payload, runId: String(runId) });
  };

  const project = await Project.findById(projectId);
  if (!project) throw new Error("Project not found");

  const undo = {
    desc: project.desc,
    roles: [...(project.roles || [])],
    pitch: project.pitch || "",
    journey: null,
    milestones: [],
    taskIds: [],
    buildId: null,
    health: null,
  };

  emit({
    step: 1,
    action: "reading_project",
    status: "done",
    data: { projectName: project.name, description: project.desc },
  });
  await saveStep(runId, {
    step: 1,
    action: "reading_project",
    status: "done",
    summary: project.name,
    data: {},
  });

  emit({ step: 2, action: "build_generating", status: "running", data: {} });
  const teamNames = (project.teamMembers || [])
    .filter((m) => m.status === "joined")
    .map((m) => m.role)
    .slice(0, 4)
    .join(", ");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${project.name}</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="hero">
    <nav><strong>${project.name}</strong></nav>
    <h1>${project.name}</h1>
    <p>${project.desc || goal}</p>
    <a class="cta" href="#join">Join the team</a>
  </header>
  <section id="about">
    <h2>Why we exist</h2>
    <p>Built by students, for students — ${goal}</p>
  </section>
  <section id="team">
    <h2>Team</h2>
    <p>Looking for: ${(project.roles || []).slice(0, 4).join(" · ") || teamNames || "passionate builders"}</p>
  </section>
  <footer><p>Made with Make Big 🤖</p></footer>
  <script src="app.js"></script>
</body>
</html>`;

  const css = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;color:#1d2226;line-height:1.5}.hero{min-height:70vh;display:flex;flex-direction:column;justify-content:center;padding:2rem;background:linear-gradient(135deg,#0A66C2,#004182);color:#fff;text-align:center}nav{text-align:left;margin-bottom:2rem}.cta{display:inline-block;margin-top:1.5rem;padding:.75rem 1.5rem;background:#fff;color:#0A66C2;border-radius:999px;font-weight:700;text-decoration:none}section{padding:3rem 1.5rem;max-width:720px;margin:0 auto}footer{text-align:center;padding:2rem;color:#666;font-size:.875rem}`;

  const js = `document.querySelector('.cta')?.addEventListener('click',e=>{e.preventDefault();alert('Thanks for your interest in ${project.name}!');});`;

  emit({ step: 2, action: "build_generating", status: "done", data: { title: goal } });
  await saveStep(runId, {
    step: 2,
    action: "build_generating",
    status: "done",
    summary: "Landing page generated",
    data: {},
  });

  emit({ step: 3, action: "build_saved", status: "running", data: {} });
  const build = await Build.create({
    projectId: project._id,
    agentRunId: runId,
    title: goal || "Landing page",
    html,
    css,
    js,
    createdBy: normalizeContact(userContact),
  });
  undo.buildId = build._id.toString();
  await saveStep(runId, {
    step: 3,
    action: "build_saved",
    status: "done",
    summary: "Saved to Builds",
    data: { buildId: build._id.toString() },
  });

  emit({
    step: 4,
    action: "build_complete",
    status: "done",
    data: {
      buildId: build._id.toString(),
      html,
      css,
      js,
      title: build.title,
    },
  });

  const summary = `Landing page built and saved — open Build tab to copy code.`;
  await AgentRun.updateOne(
    { _id: runId },
    {
      $set: {
        status: "complete",
        summary,
        actionsCount: 3,
        undoSnapshot: undo,
        completedAt: new Date(),
      },
    }
  );
  io.to(projectRoom(projectId)).emit("agent_complete", {
    runId: String(runId),
    summary,
    actionsCount: 3,
    agentType: "build",
    buildId: build._id.toString(),
  });
  runningAgents.delete(String(runId));
}

export async function runAnalyzeAgent({ io, projectId, goal, runId, userContact }) {
  const ctrl = { cancelled: false };
  runningAgents.set(String(runId), ctrl);
  const emit = (payload) => {
    io.to(projectRoom(projectId)).emit("agent_step", { ...payload, runId: String(runId) });
  };

  const project = await Project.findById(projectId);
  if (!project) throw new Error("Project not found");

  const undo = {
    desc: project.desc,
    roles: [...(project.roles || [])],
    pitch: project.pitch || "",
    journey: null,
    milestones: [],
    taskIds: [],
    buildId: null,
    health: project.health ? JSON.parse(JSON.stringify(project.health)) : null,
  };

  emit({ step: 1, action: "reading_project", status: "done", data: { projectName: project.name } });
  await saveStep(runId, {
    step: 1,
    action: "reading_project",
    status: "done",
    summary: project.name,
    data: {},
  });

  emit({ step: 2, action: "health_analyzed", status: "running", data: {} });
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const [msgCount, actCount] = await Promise.all([
    Activity.countDocuments({ projectId: project._id, type: "message", createdAt: { $gte: weekAgo } }),
    Activity.countDocuments({ projectId: project._id, createdAt: { $gte: weekAgo } }),
  ]);
  const totalTasks = (project.tasks || []).length;
  const doneTasks = (project.tasks || []).filter((t) => t.status === "done").length;
  const completionRate = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const teamActive = (project.teamMembers || []).filter((m) => m.status === "joined").length + 1;

  const breakdown = {
    teamActivity: Math.min(100, teamActive * 20 + actCount * 2),
    taskCompletion: completionRate,
    communication: Math.min(100, msgCount * 5 + actCount * 3),
    progressVsTimeline: project.journey?.completionPercent ?? 10,
  };

  emit({
    step: 2,
    action: "health_analyzed",
    status: "done",
    data: { breakdown },
  });
  await saveStep(runId, {
    step: 2,
    action: "health_analyzed",
    status: "done",
    summary: `Tasks ${completionRate}% complete`,
    data: { breakdown },
  });

  emit({ step: 3, action: "recommendations_generated", status: "running", data: {} });
  const recommendations = await callGroqText(
    `Startup health for "${project.name}": team activity ${breakdown.teamActivity}/100, tasks ${completionRate}%, communication ${breakdown.communication}/100. Goal: ${goal}. Give 4 bullet recommendations.`,
    "• Run a 15-min daily standup\n• Assign owners to all open tasks\n• Post a weekly update on the feed\n• Set one milestone for the next 7 days"
  );
  emit({
    step: 3,
    action: "recommendations_generated",
    status: "done",
    data: { recommendations },
  });
  await saveStep(runId, {
    step: 3,
    action: "recommendations_generated",
    status: "done",
    summary: "Recommendations ready",
    data: { recommendations },
  });

  emit({ step: 4, action: "health_updated", status: "running", data: {} });
  const health = await computeProjectHealth(Project, User, Post, Activity, projectId);
  emit({
    step: 4,
    action: "health_updated",
    status: "done",
    data: {
      score: health?.score ?? 0,
      breakdown,
      recommendations,
    },
  });
  await saveStep(runId, {
    step: 4,
    action: "health_updated",
    status: "done",
    summary: `Health score: ${health?.score ?? 0}`,
    data: { score: health?.score },
  });

  const summary = `Health analysis complete — score ${health?.score ?? 0}/100. See recommendations in Agent history.`;
  await AgentRun.updateOne(
    { _id: runId },
    {
      $set: {
        status: "complete",
        summary,
        actionsCount: 4,
        undoSnapshot: undo,
        completedAt: new Date(),
      },
    }
  );
  io.to(projectRoom(projectId)).emit("agent_complete", {
    runId: String(runId),
    summary,
    actionsCount: 4,
    agentType: "analyze",
    health: health?.score,
  });
  runningAgents.delete(String(runId));
}

export async function runAgent({
  io,
  projectId,
  goal,
  agentType,
  runId,
  userContact,
  pushNotification,
}) {
  try {
    if (agentType === "setup") {
      await runSetupAgent({ io, projectId, goal, runId, userContact, pushNotification });
    } else if (agentType === "plan") {
      await runPlanAgent({ io, projectId, goal, runId, userContact, pushNotification });
    } else if (agentType === "build") {
      await runBuildAgent({ io, projectId, goal, runId, userContact });
    } else if (agentType === "analyze") {
      await runAnalyzeAgent({ io, projectId, goal, runId, userContact });
    } else {
      throw new Error("Invalid agentType");
    }
  } catch (error) {
    await AgentRun.updateOne(
      { _id: runId },
      {
        $set: {
          status: "failed",
          errorMessage: error.message,
          completedAt: new Date(),
        },
      }
    );
    io.to(projectRoom(projectId)).emit("agent_complete", {
      runId: String(runId),
      summary: error.message || "Agent failed",
      failed: true,
    });
    runningAgents.delete(String(runId));
  }
}

export async function undoAgentRun(runId) {
  const run = await AgentRun.findById(runId).lean();
  if (!run?.undoSnapshot) throw new Error("Nothing to undo");

  const project = await Project.findById(run.projectId);
  if (!project) throw new Error("Project not found");

  const snap = run.undoSnapshot;
  if (snap.desc !== undefined) project.desc = snap.desc;
  if (snap.roles) project.roles = snap.roles;
  if (snap.pitch !== undefined) project.pitch = snap.pitch;
  if (snap.journey) project.journey = snap.journey;
  if (snap.milestones) project.milestones = snap.milestones;
  if (snap.health) project.health = snap.health;

  if (snap.taskIds?.length) {
    project.tasks = project.tasks.filter((t) => !snap.taskIds.includes(t._id.toString()));
  }

  await project.save();

  if (snap.buildId) {
    await Build.deleteOne({ _id: snap.buildId });
  }

  await AgentRun.updateOne({ _id: runId }, { $set: { status: "cancelled" } });
  return { reverted: true };
}

export async function getAgentRuns(projectId, limit = 20) {
  const runs = await AgentRun.find({ projectId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return runs.map((r) => ({
    id: r._id.toString(),
    goal: r.goal,
    agentType: r.agentType,
    status: r.status,
    summary: r.summary,
    actionsCount: r.actionsCount,
    steps: r.steps || [],
    runBy: r.runBy,
    createdAt: r.createdAt,
    completedAt: r.completedAt,
    canUndo: r.status === "complete" && Boolean(r.undoSnapshot),
  }));
}

export const SETUP_STEP_LABELS = {
  1: "Read project details",
  2: "Wrote project description",
  3: "Created team roles",
  4: "Creating tasks",
  5: "Setting journey stage",
  6: "Writing your pitch",
  7: "Final summary",
};

export const PLAN_STEP_LABELS = {
  1: "Read current state",
  2: "Analyze gaps",
  3: "Generate sprint plan",
  4: "Set milestones",
  5: "Notify team",
};

export const BUILD_STEP_LABELS = {
  1: "Read project context",
  2: "Generate landing page code",
  3: "Save build",
  4: "Build complete",
};

export const ANALYZE_STEP_LABELS = {
  1: "Read all project data",
  2: "Calculate health breakdown",
  3: "Generate recommendations",
  4: "Update health score",
};
