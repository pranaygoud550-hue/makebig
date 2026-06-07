import mongoose from "mongoose";

const linkHistorySchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    url: { type: String, required: true, trim: true },
    title: { type: String, default: "", trim: true },
    question: { type: String, default: "", trim: true },
    response: { type: String, default: "" },
    summary: { type: String, default: "" },
    readAt: { type: Date, default: Date.now, index: true },
    readBy: { type: String, lowercase: true, trim: true },
    githubMeta: {
      name: String,
      stars: Number,
      forks: Number,
      language: String,
      lastCommitMessage: String,
      lastCommitDate: Date,
    },
  },
  { timestamps: false }
);

linkHistorySchema.index({ projectId: 1, readAt: -1 });

export default mongoose.model("LinkHistory", linkHistorySchema);
