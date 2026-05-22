import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    authorId:  { type: String, required: true, trim: true },
    body:      { type: String, required: true, trim: true },
    imageUrl:  { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Post", postSchema);
