import { Schema, model } from "mongoose";
export interface CollaborationDocument { id: string; projectId: string; industryInstitutionId: string; universityInstitutionId: string; organization: string; collaborationType: "mentorship" | "funding" | "prototyping" | "deployment" | "technology_transfer"; message: string; status: "pending" | "accepted" | "declined"; version: number; createdAt: Date; updatedAt: Date; }
const schema = new Schema<CollaborationDocument>({
  id: { type: String, required: true, unique: true }, projectId: { type: String, required: true, index: true }, industryInstitutionId: { type: String, required: true, index: true }, universityInstitutionId: { type: String, required: true, index: true }, organization: { type: String, required: true },
  collaborationType: { type: String, enum: ["mentorship", "funding", "prototyping", "deployment", "technology_transfer"], required: true }, message: { type: String, required: true }, status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" }, version: { type: Number, default: 1 },
}, { timestamps: true, versionKey: false });
schema.index({ projectId: 1, industryInstitutionId: 1 }, { unique: true });
export const Collaboration = model<CollaborationDocument>("Collaboration", schema);
