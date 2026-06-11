import mongoose from "mongoose";

const mentorRequestSchema = new mongoose.Schema(
  {
    mentorContact: { type: String, required: true, lowercase: true, trim: true, index: true },
    studentContact: { type: String, required: true, lowercase: true, trim: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    message: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "completed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.models.MentorRequest ||
  mongoose.model("MentorRequest", mentorRequestSchema);
