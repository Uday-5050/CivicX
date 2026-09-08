import { Schema, model } from "mongoose";
import type { ChallengeInput, Proposal } from "./university.schemas";
export interface ChallengeDocument extends Omit<ChallengeInput, "institutionId"> {
  institutionId: string;
  sourceSubmissionId?: string;
  decision: "pending" | "accepted" | "declined" | "info_requested";
  version: number;
  proposal?: Proposal;
  project?: { id: string; status: "active"; createdAt: Date };
  decidedBy?: string;
  decidedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
const proposal = new Schema({ approach: String, timeline: String, mentorId: String, studentIds: [String] }, { _id: false });
const schema = new Schema<ChallengeDocument>({
  institutionId: { type: String, required: true, index: true },
  sourceSubmissionId: { type: String, index: true, sparse: true },
  title: { type: String, required: true }, summary: { type: String, required: true },
  domain: { type: String, required: true }, priority: { type: String, enum: ["low", "medium", "high"], required: true },
  department: { type: String, required: true }, organization: { type: String, required: true },
  feasibilityNotes: [String],
  members: [new Schema({ id: String, name: String, role: { type: String, enum: ["mentor", "student"] }, department: String, email: String }, { _id: false })],
  decision: { type: String, enum: ["pending", "accepted", "declined", "info_requested"], default: "pending" },
  version: { type: Number, default: 1 }, proposal: { type: proposal, default: undefined },
  project: { type: new Schema({ id: String, status: { type: String, enum: ["active"] }, createdAt: Date }, { _id: false }), default: undefined },
  decidedBy: String, decidedAt: Date,
}, { timestamps: true, versionKey: false });
schema.index({ institutionId: 1, createdAt: -1 });
export const UniversityChallenge = model<ChallengeDocument>("UniversityChallenge", schema);
