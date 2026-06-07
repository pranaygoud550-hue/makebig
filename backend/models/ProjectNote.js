import mongoose from "mongoose";

const projectNoteSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      unique: true,
      index: true,
    },
    content: { type: String, default: "", maxlength: 50000 },
    updatedBy: { type: String, default: "" },
    updatedByName: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("ProjectNote", projectNoteSchema);
