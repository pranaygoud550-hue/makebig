import mongoose from "mongoose";

const friendRequestSchema = new mongoose.Schema(
  {
    fromContact: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    toContact: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
  },
  { timestamps: true }
);

friendRequestSchema.index({ fromContact: 1, toContact: 1 });

export default mongoose.model("FriendRequest", friendRequestSchema);
