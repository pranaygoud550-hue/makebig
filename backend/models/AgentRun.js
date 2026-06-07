import mongoose from "mongoose";

const agentRunSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    goal: { type: String, required: true, trim: true },
    agentType: {
      type: String,
      enum: ["setup", "build", "plan", "analyze"],
      required: true,
    },
    status: {
      type: String,
      enum: ["running", "complete", "failed", "cancelled"],
      default: "running",
    },
    steps: [
      {
        step: Number,
        action: String,
        status: String,
        summary: String,
        data: mongoose.Schema.Types.Mixed,
        completedAt: Date,
      },
    ],
    summary: { type: String, default: "" },
    actionsCount: { type: Number, default: 0 },
    runBy: { type: String, lowercase: true, trim: true },
    undoSnapshot: {
      desc: String,
      roles: [String],
      pitch: String,
      journey: mongoose.Schema.Types.Mixed,
      milestones: mongoose.Schema.Types.Mixed,
      taskIds: [String],
      buildId: String,
      health: mongoose.Schema.Types.Mixed,
    },
    errorMessage: String,
    completedAt: Date,
  },
  { timestamps: true }
);

agentRunSchema.index({ projectId: 1, createdAt: -1 });

export default mongoose.model("AgentRun", agentRunSchema);
