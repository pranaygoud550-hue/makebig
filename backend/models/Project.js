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
    tags: [{ type: String, lowercase: true, trim: true }],
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
        dueDate: { type: Date },
        reminderSent: { type: Boolean, default: false },
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
    validation: {
      usersInterviewed: { type: Number, default: 0 },
      surveyResults: { type: Number, default: 0 },
      mvpExists: { type: Boolean, default: false },
      customerFeedback: { type: Number, default: 0 },
    },
    startupReadiness: {
      team: { type: Number, default: 0 },
      market: { type: Number, default: 0 },
      validation: { type: Number, default: 0 },
      progress: { type: Number, default: 0 },
      overall: { type: Number, default: 0 },
      computedAt: Date,
    },
    logoUrl: { type: String, default: '' },
    githubUrl: { type: String, default: '', trim: true },
    gallery: [String],
    journey: {
      currentStage: {
        type: String,
        enum: ['idea', 'research', 'prototype', 'mvp', 'beta', 'launch', 'revenue', 'scaling'],
      },
      completionPercent: { type: Number, min: 0, max: 100 },
      configured: { type: Boolean },
      nextMilestone: { type: String },
      lastUpdated: { type: Date },
      stageNotes: [
        {
          stage: String,
          note: String,
          screenshotUrl: String,
          createdAt: { type: Date, default: Date.now },
          createdBy: String,
        },
      ],
    },
    health: {
      score: { type: Number, default: 0 },
      activity: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 },
      progress: { type: Number, default: 0 },
      taskCompletion: { type: Number, default: 0 },
      metrics: {
        activeMembers: { type: Number, default: 0 },
        lastActivityAt: Date,
        openTasks: { type: Number, default: 0 },
        completedTasks: { type: Number, default: 0 },
        updatesThisWeek: { type: Number, default: 0 },
        joinRequests: { type: Number, default: 0 },
        responseTimeHours: { type: Number, default: 0 },
      },
      heatmap: [{ date: String, count: Number }],
      computedAt: Date,
    },
    featured: {
      badge: String,
      badgeIcon: String,
      weekStart: String,
      featuredAt: Date,
      rankScore: Number,
    },
    analytics: {
      followerCount: { type: Number, default: 0 },
      viewCount: { type: Number, default: 0 },
      profileViews: { type: Number, default: 0 },
    },
    leaveReasons: [
      {
        contact: String,
        name: String,
        reason: String,
        reasonText: String,
        leftAt: { type: Date, default: Date.now },
      },
    ],
    weeklyReportWeek: { type: String, default: '' },
    lastHealthAlertAt: { type: Date },
    inactivePromptAt: { type: Date },
    inactiveConfirmedAt: { type: Date },
    aiValidated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

projectSchema.index({ ownerContact: 1, updatedAt: -1 });
projectSchema.index({ status: 1, visibility: 1, updatedAt: -1 });
projectSchema.index({ "teamMembers.contact": 1 });

export default mongoose.model("Project", projectSchema);
