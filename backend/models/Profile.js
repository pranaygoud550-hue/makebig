import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    contact: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["member", "creator", "both"],
      default: "member",
    },
    tagline: {
      type: String,
      default: "",
      trim: true,
    },
    categoryIds: [String],
    skills: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    rateMin: Number,
    rateMax: Number,
    currency: {
      type: String,
      default: "USD",
    },
    availableForInvites: {
      type: Boolean,
      default: false,
    },
    bio: String,
    portfolio: String,
    profileImage: String,
    workRatingAvg: { type: Number, default: 0 },
    workRatingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Profile", profileSchema);
