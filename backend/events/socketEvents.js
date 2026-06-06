import Message from "../models/Message.js";
import Activity from "../models/Activity.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

const activeUsers = new Map(); // userId -> { socketId, name, contact }

export function setupSocketEvents(io) {
  io.on("connection", (socket) => {
    if (socket.user?.userId) {
      socket.join(`user_${socket.user.userId}`);
    }
    console.log(`👤 User connected: ${socket.id}`);

    // User joins project room
    socket.on("join_project", async (data) => {
      const { projectId, userId, userName, userContact } = data;
      const roomName = `project_${projectId}`;

      socket.join(roomName);
      activeUsers.set(socket.id, {
        userId,
        userName,
        userContact,
        socketId: socket.id,
        projectId,
      });

      // Update user's socket ID in DB
      try {
        await User.findOneAndUpdate(
          { contact: userContact },
          { socketId: socket.id, lastActive: new Date() }
        );
      } catch (error) {
        console.error("Error updating user socket:", error);
      }

      io.to(roomName).emit("user_joined", {
        userId,
        userName,
        message: `${userName} joined the project`,
      });

      // Send list of active users in room
      const usersInRoom = Array.from(activeUsers.values()).filter(
        (u) => u.projectId === projectId
      );
      io.to(roomName).emit("active_users", usersInRoom);
    });

    // User leaves project room
    socket.on("leave_project", (data) => {
      const { projectId, userId, userName } = data;
      const roomName = `project_${projectId}`;

      activeUsers.delete(socket.id);
      socket.leave(roomName);

      io.to(roomName).emit("user_left", {
        userId,
        userName,
        message: `${userName} left the project`,
      });
    });

    // Real-time message
    socket.on("send_message", async (data) => {
      const { projectId, senderId, senderName, content, type = "text" } = data;
      const roomName = `project_${projectId}`;

      try {
        const message = await Message.create({
          projectId,
          senderId,
          senderName,
          content,
          type,
        });

        io.to(roomName).emit("new_message", {
          _id: message._id,
          id: message._id.toString(),
          projectId,
          senderId,
          senderName,
          content,
          type,
          createdAt: message.createdAt,
        });

        // Create activity
        const activity = await Activity.create({
          projectId,
          userId: senderId,
          type: "team_message",
          description: `${senderName}: ${content.substring(0, 50)}...`,
        });

        io.to(roomName).emit("activity_created", {
          _id: activity._id,
          id: activity._id.toString(),
          projectId,
          userId: senderId,
          type: activity.type,
          description: activity.description,
          createdAt: activity.createdAt,
        });
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Real-time typing indicator
    socket.on("user_typing", (data) => {
      const { projectId, userId, userName, isTyping } = data;
      const roomName = `project_${projectId}`;

      io.to(roomName).emit("user_typing", {
        userId,
        userName,
        isTyping,
      });
    });

    // Project update (real-time)
    socket.on("project_updated", async (data) => {
      const { projectId, updatedFields, updatedBy, updatedByName } = data;
      const roomName = `project_${projectId}`;

      try {
        io.to(roomName).emit("project_changed", {
          projectId,
          updatedFields,
          updatedBy,
          updatedByName,
          timestamp: new Date(),
        });

        // Create activity
        await Activity.create({
          projectId,
          userId: updatedBy,
          type: "project_updated",
          description: `${updatedByName} updated project`,
          metadata: updatedFields,
        });
      } catch (error) {
        console.error("Error updating project:", error);
      }
    });

    // Team member status update
    socket.on("member_status_changed", async (data) => {
      const { projectId, memberId, memberContact, memberName, status, role } = data;
      const roomName = `project_${projectId}`;

      io.to(roomName).emit("member_status_changed", {
        projectId,
        memberContact: memberContact || memberId,
        memberName,
        status,
        role,
        timestamp: new Date(),
      });

      // Create activity
      await Activity.create({
        projectId,
        userId: memberId,
        type: "member_joined",
        description: `${memberName} status: ${status}`,
      });
    });

    // Task completed notification
    socket.on("task_completed", async (data) => {
      const { projectId, completedBy, completedByName, taskName } = data;
      const roomName = `project_${projectId}`;

      io.to(roomName).emit("task_completed", {
        projectId,
        completedBy,
        completedByName,
        taskName,
        timestamp: new Date(),
      });

      // Create activity
      await Activity.create({
        projectId,
        userId: completedBy,
        type: "task_completed",
        description: `${completedByName} completed: ${taskName}`,
      });
    });

    // Send notification to specific user
    socket.on("send_notification", async (data) => {
      const { toUserId, type, title, message, actionUrl, metadata } = data;

      try {
        const notification = await Notification.create({
          userId: toUserId,
          type,
          title,
          message,
          actionUrl,
          metadata,
        });

        // Find socket of recipient and send notification
        const recipientSocket = Array.from(activeUsers.values()).find(
          (u) => u.userId === toUserId
        )?.socketId;

        if (recipientSocket) {
          io.to(recipientSocket).emit("notification_received", {
            _id: notification._id,
            type,
            title,
            message,
            actionUrl,
            createdAt: notification.createdAt,
          });
        }
      } catch (error) {
        console.error("Error sending notification:", error);
      }
    });

    // Disconnect
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

    // Error handling
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });
}

export function getActiveUsers() {
  return Array.from(activeUsers.values());
}
