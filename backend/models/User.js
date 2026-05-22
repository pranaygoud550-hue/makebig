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
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
