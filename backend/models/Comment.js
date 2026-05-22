import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    postId:          { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    authorId:        { type: String, required: true, trim: true },
    body:            { type: String, required: true, trim: true },
    parentCommentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Comment", commentSchema);
