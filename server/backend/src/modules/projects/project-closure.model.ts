import { Schema, model } from "mongoose";

export type ProjectClosureAction = "closed" | "reopened";

export interface ProjectClosureDocument {
  closureId: string;
  projectId: string;
  submissionId: string;
  action: ProjectClosureAction;
  reason?: string;
  outcome?: { baseline: string; target?: string; result: string; unit: string; measurementStart?: string; measurementEnd?: string; method?: string; beneficiaries?: string; evidence: string[]; validationNote?: string };
  actorId: string;
  createdAt: Date;
}

const schema = new Schema<ProjectClosureDocument>({
  closureId: { type: String, required: true, unique: true },
  projectId: { type: String, required: true, index: true },
  submissionId: { type: String, required: true, index: true },
  action: { type: String, enum: ["closed", "reopened"], required: true },
  reason: { type: String, trim: true, maxlength: 2000 },
  outcome: { type: new Schema({ baseline: String, target: String, result: String, unit: String, measurementStart: String, measurementEnd: String, method: String, beneficiaries: String, evidence: [String], validationNote: String }, { _id: false }) },
  actorId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

schema.index({ projectId: 1, createdAt: 1 });
export const ProjectClosure = model<ProjectClosureDocument>("ProjectClosure", schema);
