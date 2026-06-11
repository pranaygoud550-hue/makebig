import { connectDB } from "../db/connection.js";
import { formatResponse } from "../utils/helpers.js";
import { normalizeContact } from "../utils/helpers.js";
import Project from "../models/Project.js";
import Message from "../models/Message.js";
import Activity from "../models/Activity.js";
import StandupLog from "../models/StandupLog.js";
import User from "../models/User.js";
import Post from "../models/Post.js";
import { computeProjectHealth } from "../utils/ecosystem.js";
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
import { runWeeklyDigests, isMonday9amIST } from "../../lib/weeklyDigest.js";
import { pushNotification, getTeammateContacts } from "../routes/legacy.routes.js";

const PORT = process.env.PORT || 5001;

async function attachNextApp(app, rootDir) {
  if (process.env.SERVE_NEXT !== "true") return;

  process.env.INTERNAL_API_URL = `http://127.0.0.1:${PORT}`;

  const next = (await import("next")).default;
  const nextApp = next({ dev: false, dir: rootDir });
  await nextApp.prepare();
  const handle = nextApp.getRequestHandler();

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

async function runTaskDueReminders(io) {
  try {
    const now = new Date();
    const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const projects = await Project.find({
      tasks: {
        $elemMatch: {
          dueDate: { $lte: in24h, $gte: now },
          status: { $ne: "done" },
          reminderSent: { $ne: true },
        },
      },
    });

    for (const project of projects) {
      let changed = false;
      for (const task of project.tasks) {
        if (!task.dueDate || task.status === "done" || task.reminderSent) continue;
        const due = new Date(task.dueDate);
        if (due < now || due > in24h) continue;

        const assignee = normalizeContact(task.assignee);
        if (assignee) {
          await pushNotification({
            contact: assignee,
            projectId: project._id,
            type: "task_due_reminder",
            title: "Task due soon",
            message: `"${task.title}" on ${project.name} is due within 24 hours`,
            actionUrl: `/dashboard`,
          });
          if (assignee.includes("@")) {
            await sendTaskReminderEmail(assignee, task.title, project.name, task.dueDate);
          }
        }

        io.to(`project_${project._id}`).emit("task_reminder", {
          projectId: project._id.toString(),
          taskId: task._id?.toString(),
          title: task.title,
        });

        task.reminderSent = true;
        changed = true;
      }
      if (changed) await project.save();
    }
  } catch (err) {
    console.error("Task reminder cron:", err.message);
  }
}

async function runWeeklyReports() {
  if (!isSunday8pmIST()) return;
  try {
    const weekKey = getISTWeekKey();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const projects = await Project.find({
      status: { $in: ["published", "in-progress"] },
      weeklyReportWeek: { $ne: weekKey },
    }).limit(100);

    for (const project of projects) {
      const memberCount =
        (project.teamMembers || []).filter((m) => m.status === "joined").length + 1;
      if (memberCount < 2) continue;

      const activityCount = await Activity.countDocuments({
        projectId: project._id,
        createdAt: { $gte: weekAgo },
      });
      const messageCount = await Message.countDocuments({
        projectId: project._id,
        createdAt: { $gte: weekAgo },
      });
      if (activityCount + messageCount < 1) continue;

      const data = await gatherProjectWeeklyData(
        Project,
        Message,
        Activity,
        StandupLog,
        project
      );
      const reportBody = await generateWeeklyReportAI(data);
      const owner = normalizeContact(project.ownerContact);
      if (owner.includes("@")) {
        await sendWeeklyReportEmail(
          owner,
          project.name,
          reportBody,
          weekLabelIST(),
          project.slug ? `https://makebig.vercel.app/startup/${project.slug}` : undefined
        );
      }
      await pushNotification({
        contact: owner,
        projectId: project._id,
        type: "weekly_report",
        title: `Weekly report — ${project.name}`,
        message: reportBody.slice(0, 160),
        actionUrl: "/",
      });
      project.weeklyReportWeek = weekKey;
      await project.save();
    }
  } catch (err) {
    console.error("Weekly report cron:", err.message);
  }
}

async function runDailyHealthChecks() {
  try {
    const projects = await Project.find({
      status: { $in: ["published", "in-progress"] },
    }).limit(200);

    for (const project of projects) {
      const health = await computeProjectHealth(
        Project,
        User,
        Post,
        Activity,
        project._id.toString()
      );
      const score = health?.score ?? project.health?.score ?? 0;
      const lastActivity = health?.metrics?.lastActivityAt || project.health?.metrics?.lastActivityAt;
      const inactiveDays = daysSince(lastActivity);

      if (score < 40) {
        const alertRecent =
          project.lastHealthAlertAt &&
          Date.now() - new Date(project.lastHealthAlertAt).getTime() < 3 * 86400000;
        if (!alertRecent) {
          const teammates = await getTeammateContacts(project._id.toString());
          for (const c of teammates) {
            await pushNotification({
              contact: c,
              projectId: project._id,
              type: "project_health",
              title: "Project health alert",
              message: `⚠️ ${project.name} health score dropped to ${score}. Last activity was ${inactiveDays} days ago. Time to check in with your team!`,
              actionUrl: "/",
            });
          }
          const owner = normalizeContact(project.ownerContact);
          if (owner.includes("@")) {
            await sendHealthAlertEmail(owner, project.name, score, inactiveDays);
          }
          project.lastHealthAlertAt = new Date();
          if (inactiveDays >= 7 && !project.inactivePromptAt) {
            project.inactivePromptAt = new Date();
          }
          await project.save();
        }
      } else if (inactiveDays >= 7 && !project.inactivePromptAt && !project.inactiveConfirmedAt) {
        project.inactivePromptAt = new Date();
        await project.save();
      }
    }
  } catch (err) {
    console.error("Health check cron:", err.message);
  }
}

export async function startServer(ctx) {
  const { app, httpServer, io, rootDir } = ctx;

  await connectDB();
  await attachNextApp(app, rootDir);

  setInterval(() => runTaskDueReminders(io), 60 * 60 * 1000);
  setTimeout(() => runTaskDueReminders(io), 15000);
  setInterval(runWeeklyReports, 60 * 60 * 1000);
  setTimeout(runWeeklyReports, 30000);
  async function runDigestCron() {
    if (!isMonday9amIST()) return;
    try {
      await runWeeklyDigests();
    } catch (e) {
      console.error("[digest] cron error:", e?.message);
    }
  }
  setInterval(runDigestCron, 60 * 60 * 1000);
  setTimeout(runDigestCron, 60000);
  setInterval(runDailyHealthChecks, 24 * 60 * 60 * 1000);
  setTimeout(runDailyHealthChecks, 45000);

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
