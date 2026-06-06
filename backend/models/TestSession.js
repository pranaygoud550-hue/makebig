import mongoose from 'mongoose';

const violationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'tab_switch',
        'window_blur',
        'minimize',
        'fullscreen_exit',
        'copy',
        'paste',
        'right_click',
        'selection',
      ],
      required: true,
    },
    message: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const proctoringLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'face_present',
        'no_face',
        'multiple_faces',
        'looking_away',
        'frequent_disappearance',
        'excessive_head_movement',
      ],
      required: true,
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const testSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    contact: { type: String, lowercase: true, trim: true, default: '' },
    skillId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['active', 'submitted', 'auto_submitted', 'flagged', 'void'],
      default: 'active',
    },
    webcamConsent: { type: Boolean, default: false },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    submittedAt: Date,
    violations: [violationSchema],
    proctoringLogs: [proctoringLogSchema],
    integrityScore: { type: Number, default: 100 },
    testScore: { type: Number, default: 0 },
    finalScore: { type: Number, default: 0 },
    mcqScore: { type: Number, default: 0 },
    practicalScore: { type: Number, default: 0 },
    proctorFlags: [String],
    suspicious: { type: Boolean, default: false },
    mcqAnswers: [Number],
    practicalAnswers: [Number],
  },
  { timestamps: true }
);

testSessionSchema.index({ contact: 1, skillId: 1, createdAt: -1 });
testSessionSchema.index({ suspicious: 1, status: 1 });

export default mongoose.models.TestSession ||
  mongoose.model('TestSession', testSessionSchema);
