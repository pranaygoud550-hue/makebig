import mongoose from "mongoose";

const mentorSchema = new mongoose.Schema(
  {
    contact: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    title: { type: String, default: "", trim: true },
    organization: { type: String, default: "", trim: true },
    expertise: [String],
    bio: { type: String, default: "" },
    sessionMinutes: { type: Number, default: 30 },
    available: { type: Boolean, default: true },
    city: { type: String, default: "" },
    linkedin: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Mentor || mongoose.model("Mentor", mentorSchema);
