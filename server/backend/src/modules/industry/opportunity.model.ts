import { Schema, model } from "mongoose";

export const opportunityNeeds = ["mentorship", "funding", "prototyping", "deployment", "technology_transfer"] as const;
export type OpportunityNeed = typeof opportunityNeeds[number];

export interface OpportunityDocument {
  id: string;
  projectId: string;
  universityInstitutionId: string;
  title: string;
  summary: string;
  needs: OpportunityNeed[];
  status: "published" | "closed";
  publishedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<OpportunityDocument>({
  id: { type: String, required: true, unique: true },
  projectId: { type: String, required: true, unique: true, index: true },
  universityInstitutionId: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  summary: { type: String, required: true, trim: true, maxlength: 5000 },
  needs: { type: [String], enum: opportunityNeeds, required: true },
  status: { type: String, enum: ["published", "closed"], default: "published", index: true },
  publishedBy: { type: String, required: true },
}, { timestamps: true, versionKey: false });

schema.index({ status: 1, createdAt: -1 });
export const Opportunity = model<OpportunityDocument>("Opportunity", schema);
