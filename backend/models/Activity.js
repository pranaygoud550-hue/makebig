import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "project_created",
        "project_published",
        "project_updated",
        "member_joined",
        "member_left",
        "member_removed",
        "comment_added",
        "task_created",
        "task_updated",
        "task_deleted",
        "task_completed",
        "milestone_reached",
        "team_message",
        "journey_stage_changed",
        "milestone_completed",
        "product_launched",
        "first_revenue",
        "beta_users",
        "team_hired",
        "startup_update",
      ],
      required: true,
    },
    description: String,
    metadata: mongoose.Schema.Types.Mixed,
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Activity", activitySchema);
