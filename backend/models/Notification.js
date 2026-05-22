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
        "message",
        "activity",
        "mention",
        "project_update",
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

export default mongoose.model("Notification", notificationSchema);
