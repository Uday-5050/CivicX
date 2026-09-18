import { Schema, model } from "mongoose";
import { opportunityNeeds, type OpportunityNeed } from "./opportunity.model";

export type SupportOfferStatus = "pending" | "accepted" | "declined" | "withdrawn";

export interface SupportOfferDocument {
  id: string;
  opportunityId: string;
  projectId: string;
  industryInstitutionId: string;
  universityInstitutionId: string;
  organization: string;
  supportType: OpportunityNeed;
  responsibilities: string;
  message: string;
  amountMinor?: number;
  currency?: string;
  inKindDescription?: string;
  status: SupportOfferStatus;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<SupportOfferDocument>({
  id: { type: String, required: true, unique: true },
  opportunityId: { type: String, required: true, index: true },
  projectId: { type: String, required: true, index: true },
  industryInstitutionId: { type: String, required: true, index: true },
  universityInstitutionId: { type: String, required: true, index: true },
  organization: { type: String, required: true },
  supportType: { type: String, enum: opportunityNeeds, required: true },
  responsibilities: { type: String, required: true, trim: true, maxlength: 5000 },
  message: { type: String, required: true, trim: true, maxlength: 5000 },
  amountMinor: { type: Number, min: 0 },
  currency: { type: String, trim: true, uppercase: true, minlength: 3, maxlength: 3 },
  inKindDescription: { type: String, trim: true, maxlength: 5000 },
  status: { type: String, enum: ["pending", "accepted", "declined", "withdrawn"], default: "pending", index: true },
  version: { type: Number, default: 1 },
  createdBy: { type: String, required: true },
}, { timestamps: true, versionKey: false });

schema.index({ opportunityId: 1, industryInstitutionId: 1 }, { unique: true });
export const SupportOffer = model<SupportOfferDocument>("SupportOffer", schema);
