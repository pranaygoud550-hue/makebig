import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    categoryId: {
      type: String,
      required: true,
    },
    projectPurpose: {
      type: String,
      enum: ["employment", "college", "creative", "community"],
      default: "college",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    desc: {
      type: String,
      default: "",
      trim: true,
    },
    roles: [String],
    salaryMin: Number,
    salaryMax: Number,
    currency: {
      type: String,
      default: "USD",
    },
    ownerContact: {
      type: String,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "in-progress", "completed", "closed"],
      default: "draft",
    },
    teamMembers: [
      {
        contact: String,
        role: String,
        status: {
          type: String,
          enum: ["invited", "pending", "joined", "completed", "left"],
          default: "invited",
        },
        joinedAt: Date,
      },
    ],
    tasks: [
      {
        title: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        status: {
          type: String,
          enum: ['todo', 'in-progress', 'done'],
          default: 'todo',
        },
        priority: {
          type: String,
          enum: ['high', 'medium', 'low'],
          default: 'medium',
        },
        assignee: { type: String, default: '' },
        createdBy: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    maxTeamSize: {
      type: Number,
      default: 10,
    },
    visibility: {
      type: String,
      enum: ["public", "private", "invite-only"],
      default: "public",
    },
    city: {
      type: String,
      default: "",
      trim: true,
    },
    state: {
      type: String,
      default: "",
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Project", projectSchema);
