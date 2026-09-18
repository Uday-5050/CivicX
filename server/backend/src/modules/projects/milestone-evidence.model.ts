import { Schema, model } from "mongoose";
import { projectStages, type ProjectStage } from "./project.model";

export type MilestoneEvidenceStatus = "pending" | "approved" | "rejected";

export interface MilestoneEvidenceDocument {
  evidenceId: string;
  projectId: string;
  targetStage: ProjectStage;
  revision: number;
  note: string;
  links: string[];
  submittedBy: string;
  status: MilestoneEvidenceStatus;
  submittedAt: Date;
  updatedAt: Date;
}

const schema = new Schema<MilestoneEvidenceDocument>({
  evidenceId: { type: String, required: true, unique: true },
  projectId: { type: String, required: true, index: true },
  targetStage: { type: String, enum: projectStages, required: true },
  revision: { type: Number, required: true, min: 1 },
  note: { type: String, required: true, trim: true, maxlength: 5000 },
  links: { type: [String], default: [] },
  submittedBy: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
  submittedAt: { type: Date, required: true, default: Date.now },
}, { timestamps: { createdAt: "submittedAt", updatedAt: "updatedAt" }, versionKey: false });

schema.index({ projectId: 1, targetStage: 1, revision: 1 }, { unique: true });
schema.index({ projectId: 1, targetStage: 1, submittedAt: -1 });
export const MilestoneEvidence = model<MilestoneEvidenceDocument>("MilestoneEvidence", schema);
