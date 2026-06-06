import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    projectId: mongoose.Schema.Types.ObjectId,
    type: {
      type: String,
      enum: [
        "invite",
        "join",
        "join_request",
        "friend_request",
        "message",
        "activity",
        "mention",
        "project_update",
        "post",
        "like",
        "comment",
      ],
      required: true,
    },
    title: String,
    message: String,
    isRead: {
      type: Boolean,
      default: false,
    },
    actionUrl: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

export default mongoose.model("Notification", notificationSchema);
