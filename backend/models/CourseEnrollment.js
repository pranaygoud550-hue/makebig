import mongoose from "mongoose";

const courseEnrollmentSchema = new mongoose.Schema(
  {
    userContact: { type: String, required: true, lowercase: true, trim: true },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    completedLessonIds: [{ type: String }],
    enrolledAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

courseEnrollmentSchema.index({ userContact: 1, courseId: 1 }, { unique: true });

export default mongoose.models.CourseEnrollment ||
  mongoose.model("CourseEnrollment", courseEnrollmentSchema);
