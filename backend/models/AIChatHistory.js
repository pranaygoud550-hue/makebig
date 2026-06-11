import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, default: "" },
    action: { type: String, default: "" },
    devMode: { type: Boolean, default: false },
    ts: { type: Number, default: () => Date.now() },
    linkMeta: {
      url: String,
      title: String,
      domain: String,
    },
    github: mongoose.Schema.Types.Mixed,
    isLinkRead: { type: Boolean, default: false },
  },
  { _id: false }
);

const aiChatHistorySchema = new mongoose.Schema(
  {
    contact: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    threadKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    projectId: { type: String, default: "", trim: true },
    advisorMode: { type: Boolean, default: false },
    messages: {
      type: [chatMessageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

aiChatHistorySchema.index({ contact: 1, threadKey: 1 }, { unique: true });

export default mongoose.models.AIChatHistory ||
  mongoose.model("AIChatHistory", aiChatHistorySchema);
