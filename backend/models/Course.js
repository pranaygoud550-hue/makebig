import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
    videoUrl: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "", trim: true },
    categoryId: { type: String, required: true },
    skills: [{ type: String, trim: true }],
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    hours: { type: Number, default: 1 },
    coverImage: { type: String, default: "" },
    lessons: [lessonSchema],
    projectSlug: { type: String, default: "" },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

courseSchema.index({ categoryId: 1, published: 1 });
courseSchema.index({ slug: 1 });

export default mongoose.models.Course || mongoose.model("Course", courseSchema);
