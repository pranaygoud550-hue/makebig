import mongoose from "mongoose";

const buildSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    agentRunId: { type: mongoose.Schema.Types.ObjectId, ref: "AgentRun" },
    title: { type: String, default: "Landing page" },
    html: { type: String, default: "" },
    css: { type: String, default: "" },
    js: { type: String, default: "" },
    createdBy: { type: String, lowercase: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Build", buildSchema);
