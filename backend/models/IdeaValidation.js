import mongoose from 'mongoose';

const ideaValidationSchema = new mongoose.Schema(
  {
    contact: { type: String, required: true, lowercase: true, trim: true },
    ideaName: { type: String, required: true, trim: true },
    problemStatement: { type: String, default: '' },
    targetAudience: { type: String, default: '' },
    businessModel: { type: String, default: '' },
    industry: { type: String, default: '' },
    report: {
      marketOpportunity: { score: Number, summary: String },
      competition: {
        competitors: [String],
        saturation: String,
        level: String,
      },
      risks: {
        technical: [String],
        business: [String],
        execution: [String],
      },
      monetization: [String],
      viabilityScore: Number,
      summary: String,
    },
    rawReport: String,
  },
  { timestamps: true }
);

ideaValidationSchema.index({ contact: 1, createdAt: -1 });

export default mongoose.models.IdeaValidation ||
  mongoose.model('IdeaValidation', ideaValidationSchema);
