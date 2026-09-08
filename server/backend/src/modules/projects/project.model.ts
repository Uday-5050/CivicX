import { Schema, model } from "mongoose";

export const projectStages = ["proposed", "funded", "prototyping", "piloted", "deployed"] as const;
export type ProjectStage = typeof projectStages[number];
type Evidence = { id: string; note: string; links: string[]; submittedBy: string; submittedAt: Date; review?: { status: "approved" | "rejected"; note: string; reviewedBy: string; reviewedAt: Date } };

export interface ProjectDocument {
  id: string; challengeId: string; submissionId?: string; institutionId: string; title: string; summary: string; domain: string; department: string;
  team: { leadId: string; mentorId: string; studentIds: string[] };
  currentStage: ProjectStage; version: number; evidence: Partial<Record<ProjectStage, Evidence>>;
  deliverables: Array<{ id: string; title: string; detail: string; author: string; createdAt: Date }>;
  ipDisclosures: Array<{ id: string; title: string; detail: string; author: string; createdAt: Date }>;
  testRecords: Array<{ id: string; title: string; detail: string; author: string; createdAt: Date }>;
  outcome?: { baseline: string; result: string; unit: string; evidence: string[]; validatedBy: string; validatedAt: Date };
  createdAt: Date; updatedAt: Date;
}

const record = new Schema({ id: String, title: String, detail: String, author: String, createdAt: Date }, { _id: false });
const evidence = new Schema({
  id: String, note: String, links: [String], submittedBy: String, submittedAt: Date,
  review: { type: new Schema({ status: { type: String, enum: ["approved", "rejected"] }, note: String, reviewedBy: String, reviewedAt: Date }, { _id: false }), default: undefined },
}, { _id: false });
const schema = new Schema<ProjectDocument>({
  id: { type: String, required: true, unique: true }, challengeId: { type: String, required: true, unique: true }, submissionId: { type: String, index: true }, institutionId: { type: String, required: true, index: true },
  title: { type: String, required: true }, summary: { type: String, required: true }, domain: { type: String, required: true }, department: { type: String, required: true },
  team: { type: new Schema({ leadId: String, mentorId: String, studentIds: [String] }, { _id: false }), required: true },
  currentStage: { type: String, enum: projectStages, default: "proposed" }, version: { type: Number, default: 1 },
  evidence: { type: new Schema({ proposed: evidence, funded: evidence, prototyping: evidence, piloted: evidence, deployed: evidence }, { _id: false }), default: {} },
  deliverables: [record], ipDisclosures: [record], testRecords: [record],
  outcome: { type: new Schema({ baseline: String, result: String, unit: String, evidence: [String], validatedBy: String, validatedAt: Date }, { _id: false }), default: undefined },
}, { timestamps: true, versionKey: false });
schema.index({ institutionId: 1, updatedAt: -1 });
export const Project = model<ProjectDocument>("Project", schema);
