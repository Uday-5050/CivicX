import { Schema, model } from "mongoose";
import { projectStages, type ProjectStage } from "./project.model";

export type MilestoneReviewStatus = "approved" | "rejected";

export interface MilestoneReviewDocument {
  reviewId: string;
  evidenceId: string;
  projectId: string;
  targetStage: ProjectStage;
  status: MilestoneReviewStatus;
  note: string;
  reviewedBy: string;
  reviewedAt: Date;
  consumedAt?: Date;
}

const schema = new Schema<MilestoneReviewDocument>({
  reviewId: { type: String, required: true, unique: true },
  evidenceId: { type: String, required: true, unique: true },
  projectId: { type: String, required: true, index: true },
  targetStage: { type: String, enum: projectStages, required: true },
  status: { type: String, enum: ["approved", "rejected"], required: true },
  note: { type: String, required: true, trim: true, maxlength: 2000 },
  reviewedBy: { type: String, required: true },
  reviewedAt: { type: Date, required: true, default: Date.now },
  consumedAt: { type: Date },
}, { versionKey: false });

schema.index({ projectId: 1, targetStage: 1, reviewedAt: -1 });
export const MilestoneReview = model<MilestoneReviewDocument>("MilestoneReview", schema);
