import mongoose from 'mongoose';

const followSchema = new mongoose.Schema(
  {
    followerContact: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
  },
  { timestamps: true }
);

followSchema.index({ followerContact: 1, projectId: 1 }, { unique: true });
followSchema.index({ projectId: 1, createdAt: -1 });

export default mongoose.models.StartupFollow ||
  mongoose.model('StartupFollow', followSchema);
