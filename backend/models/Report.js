import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reportedContact: { type: String, required: true, lowercase: true, trim: true },
    reportedBy: { type: String, required: true, lowercase: true, trim: true },
    reason: {
      type: String,
      enum: ["spam", "inappropriate", "harassment", "other"],
      required: true,
    },
    details: { type: String, default: "", maxlength: 2000 },
    status: { type: String, enum: ["pending", "reviewed", "dismissed"], default: "pending" },
  },
  { timestamps: true }
);

reportSchema.index({ reportedContact: 1, createdAt: -1 });

export default mongoose.model("Report", reportSchema);
