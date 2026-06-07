import mongoose from "mongoose";

const standupResponseSchema = new mongoose.Schema(
  {
    contact: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, default: "" },
    yesterday: { type: String, default: "" },
    today: { type: String, default: "" },
    blockers: { type: String, default: "" },
    skipped: { type: Boolean, default: false },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const standupLogSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    date: { type: String, required: true, index: true },
    responses: [standupResponseSchema],
    summary: { type: String, default: "" },
    summaryPostedAt: Date,
  },
  { timestamps: true }
);

standupLogSchema.index({ projectId: 1, date: 1 }, { unique: true });

export default mongoose.model("StandupLog", standupLogSchema);
