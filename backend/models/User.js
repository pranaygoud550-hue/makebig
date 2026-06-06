import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contact: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    isLoggedIn: {
      type: Boolean,
      default: false,
    },
    skills: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    hobbies: [
      {
        type: String,
        trim: true,
      },
    ],
    college: {
      type: String,
      default: "",
      trim: true,
    },
    graduationYear: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
      trim: true,
    },
    state: {
      type: String,
      default: "",
      trim: true,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    plan: {
      type: String,
      enum: ["free", "pro"],
      default: "free",
    },
    stripeCustomerId: String,
    socketId: String,
    verifiedSkills: [
      {
        skillId: { type: String, required: true },
        skillName: { type: String, required: true },
        score: { type: Number, default: 0 },
        testScore: { type: Number, default: 0 },
        integrityScore: { type: Number, default: 100 },
        mcqScore: { type: Number, default: 0 },
        practicalScore: { type: Number, default: 0 },
        badge: { type: String, default: 'not_verified' },
        badgeLabel: { type: String, default: 'Not Verified' },
        badgeIcon: { type: String, default: '—' },
        proctorFlags: [String],
        suspicious: { type: Boolean, default: false },
        verifiedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
