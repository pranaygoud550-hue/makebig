import Message from "../models/Message.js";
import Activity from "../models/Activity.js";
import User from "../models/User.js";
import { normalizeContact } from "../utils/helpers.js";
import {
  requireSocketUser,
  requireSocketProjectMember,
  requireSocketProjectOwner,
  displayNameForSocketUser,
  socketAuthError,
} from "./socketGuards.js";

const activeUsers = new Map(); // socketId -> { userId, name, contact, projectId }
const messageReaders = new Map(); // projectId -> Set<userId>

export function setupSocketEvents(io) {
  io.on("connection", (socket) => {
    const authUser = requireSocketUser(socket);
    if (!authUser) {
      socket.disconnect(true);
      return;
    }

    socket.join(`user_${authUser.userId}`);
    socket.join(`contact_${authUser.contact}`);

    console.log(`👤 User connected: ${socket.id} (${authUser.contact})`);

    socket.on("join_project", async (data) => {
      const projectId = data?.projectId;
      const ctx = await requireSocketProjectMember(socket, projectId);
      if (!ctx) return;

      const { user } = ctx;
      const userName = await displayNameForSocketUser(user.contact);
      const roomName = `project_${projectId}`;

      socket.join(roomName);
      activeUsers.set(socket.id, {
        userId: user.userId,
        userName,
        userContact: user.contact,
        socketId: socket.id,
        projectId,
      });

      try {
        await User.findOneAndUpdate(
          { contact: user.contact },
          { socketId: socket.id, lastActive: new Date() }
        );
      } catch (error) {
        console.error("Error updating user socket:", error);
      }

      io.to(roomName).emit("user_joined", {
        userId: user.userId,
        userName,
        message: `${userName} joined the project`,
      });

      const usersInRoom = Array.from(activeUsers.values()).filter(
        (u) => u.projectId === projectId
      );
      io.to(roomName).emit("active_users", usersInRoom);
    });

    socket.on("leave_project", (data) => {
      const user = requireSocketUser(socket);
      if (!user) return;

      const projectId = data?.projectId;
      if (!projectId) return;

      const roomName = `project_${projectId}`;
      const active = activeUsers.get(socket.id);
      const userName = active?.userName || user.contact;

      activeUsers.delete(socket.id);
      socket.leave(roomName);

      io.to(roomName).emit("user_left", {
        userId: user.userId,
        userName,
        message: `${userName} left the project`,
      });
    });

    socket.on("send_message", async (data) => {
      const projectId = data?.projectId;
      const ctx = await requireSocketProjectMember(socket, projectId);
      if (!ctx) return;

      const { user } = ctx;
      const content = String(data?.content || "").trim();
      const type = data?.type === "text" ? "text" : "text";

      if (!content) {
        socketAuthError(socket, "Message cannot be empty");
        return;
      }

      const roomName = `project_${projectId}`;
      const senderName = await displayNameForSocketUser(user.contact);

      try {
        const message = await Message.create({
          projectId,
          senderId: user.userId,
          senderName,
          content,
          type,
        });

        io.to(roomName).emit("new_message", {
          _id: message._id,
          id: message._id.toString(),
          projectId,
          senderId: user.userId,
          senderName,
          content,
          type,
          createdAt: message.createdAt,
        });

        const activity = await Activity.create({
          projectId,
          userId: user.userId,
          type: "team_message",
          description: `${senderName}: ${content.substring(0, 50)}...`,
        });

        io.to(roomName).emit("activity_created", {
          _id: activity._id,
          id: activity._id.toString(),
          projectId,
          userId: user.userId,
          type: activity.type,
          description: activity.description,
          createdAt: activity.createdAt,
        });
      } catch (error) {
        console.error("Error sending message:", error);
        socketAuthError(socket, "Failed to send message");
      }
    });

    socket.on("user_typing", async (data) => {
      const projectId = data?.projectId;
      const ctx = await requireSocketProjectMember(socket, projectId);
      if (!ctx) return;

      const { user } = ctx;
      const userName = await displayNameForSocketUser(user.contact);
      const roomName = `project_${projectId}`;

      io.to(roomName).emit("user_typing", {
        userId: user.userId,
        userName,
        isTyping: Boolean(data?.isTyping),
      });
    });

    socket.on("messages_read", async (data) => {
      const projectId = data?.projectId;
      const ctx = await requireSocketProjectMember(socket, projectId);
      if (!ctx) return;

      const { user } = ctx;
      const roomName = `project_${projectId}`;
      if (!messageReaders.has(projectId)) {
        messageReaders.set(projectId, new Set());
      }
      messageReaders.get(projectId).add(user.userId);

      io.to(roomName).emit("messages_seen", {
        projectId,
        userId: user.userId,
        readerIds: [...messageReaders.get(projectId)],
      });
    });

    socket.on("project_updated", async (data) => {
      const projectId = data?.projectId;
      const ctx = await requireSocketProjectMember(socket, projectId);
      if (!ctx) return;

      const { user } = ctx;
      const updatedByName = await displayNameForSocketUser(user.contact);
      const roomName = `project_${projectId}`;

      try {
        io.to(roomName).emit("project_changed", {
          projectId,
          updatedFields: data?.updatedFields || {},
          updatedBy: user.userId,
          updatedByName,
          timestamp: new Date(),
        });

        await Activity.create({
          projectId,
          userId: user.userId,
          type: "project_updated",
          description: `${updatedByName} updated project`,
          metadata: data?.updatedFields || {},
        });
      } catch (error) {
        console.error("Error updating project:", error);
        socketAuthError(socket, "Failed to update project");
      }
    });

    socket.on("member_status_changed", async (data) => {
      const projectId = data?.projectId;
      const ctx = await requireSocketProjectOwner(socket, projectId);
      if (!ctx) return;

      const { user } = ctx;
      const memberContact = normalizeContact(data?.memberContact || data?.memberId || "");
      const memberName = String(data?.memberName || memberContact).trim();
      const roomName = `project_${projectId}`;

      io.to(roomName).emit("member_status_changed", {
        projectId,
        memberContact: memberContact || data?.memberId,
        memberName,
        status: data?.status,
        role: data?.role,
        timestamp: new Date(),
      });

      await Activity.create({
        projectId,
        userId: user.userId,
        type: "member_joined",
        description: `${memberName} status: ${data?.status}`,
      });
    });

    socket.on("task_completed", async (data) => {
      const projectId = data?.projectId;
      const ctx = await requireSocketProjectMember(socket, projectId);
      if (!ctx) return;

      const { user } = ctx;
      const completedByName = await displayNameForSocketUser(user.contact);
      const taskName = String(data?.taskName || "a task").trim();
      const roomName = `project_${projectId}`;

      io.to(roomName).emit("task_completed", {
        projectId,
        completedBy: user.userId,
        completedByName,
        taskName,
        timestamp: new Date(),
      });

      await Activity.create({
        projectId,
        userId: user.userId,
        type: "task_completed",
        description: `${completedByName} completed: ${taskName}`,
      });
    });

    socket.on("send_notification", () => {
      socketAuthError(socket, "Notifications are sent by the server only");
    });

    socket.on("disconnect", async () => {
      const user = activeUsers.get(socket.id);
      if (user) {
        try {
          await User.findOneAndUpdate(
            { contact: user.userContact },
            { socketId: null, lastActive: new Date() }
          );
        } catch (error) {
          console.error("Error updating user on disconnect:", error);
        }

        activeUsers.delete(socket.id);

        if (user.projectId) {
          const roomName = `project_${user.projectId}`;
          io.to(roomName).emit("user_left", {
            userId: user.userId,
            userName: user.userName,
            message: `${user.userName} disconnected`,
          });
        }

        console.log(`👤 User disconnected: ${socket.id}`);
      }
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });
}

export function getActiveUsers() {
  return Array.from(activeUsers.values());
}
