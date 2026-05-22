import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    senderName: String,
    content: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["text", "system", "file", "task"],
      default: "text",
    },
    attachments: [
      {
        url: String,
        name: String,
        type: String,
      },
    ],
    edited: {
      type: Boolean,
      default: false,
    },
    editedAt: Date,
    replies: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        senderId: String,
        senderName: String,
        content: String,
        createdAt: Date,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
