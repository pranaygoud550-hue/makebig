import mongoose from "mongoose";

const inviteSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    senderContact: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    receiverContact: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: String,
    message: String,
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "declined", "withdrawn"],
      default: "pending",
    },
    expiresAt: Date,
  },
  { timestamps: true }
);

inviteSchema.index({ receiverContact: 1, status: 1 });
inviteSchema.index({ projectId: 1, receiverContact: 1 });

export default mongoose.model("Invite", inviteSchema);
