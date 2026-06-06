import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema(
  {
    userContact: { type: String, required: true, lowercase: true, trim: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  },
  { timestamps: true }
);

bookmarkSchema.index({ userContact: 1, projectId: 1 }, { unique: true });

export default mongoose.models.StartupBookmark ||
  mongoose.model('StartupBookmark', bookmarkSchema);
