import { Schema, Types, model } from "mongoose";

export type ProposalStatus = "draft" | "submitted" | "approved" | "returned";

export interface ProposalRevisionDocument {
  _id: Types.ObjectId;
  proposalId: string;
  projectId: string;
  revision: number;
  status: ProposalStatus;
  approach: string;
  timeline: string;
  beneficiaries: string;
  rootCause: string;
  workPlan: string;
  risks: string;
  resources: string;
  budgetMinor?: number;
  currency?: string;
  authorId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ProposalRevisionDocument>({
  proposalId: { type: String, required: true, unique: true, index: true },
  projectId: { type: String, required: true, index: true },
  revision: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ["draft", "submitted", "approved", "returned"], default: "submitted", index: true },
  approach: { type: String, required: true, trim: true, maxlength: 10000 },
  timeline: { type: String, required: true, trim: true, maxlength: 2000 },
  beneficiaries: { type: String, required: true, trim: true, maxlength: 5000 },
  rootCause: { type: String, required: true, trim: true, maxlength: 5000 },
  workPlan: { type: String, required: true, trim: true, maxlength: 10000 },
  risks: { type: String, required: true, trim: true, maxlength: 5000 },
  resources: { type: String, required: true, trim: true, maxlength: 5000 },
  budgetMinor: { type: Number, min: 0 },
  currency: { type: String, trim: true, uppercase: true, minlength: 3, maxlength: 3 },
  authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });

schema.index({ projectId: 1, revision: 1 }, { unique: true });
export const ProposalRevision = model<ProposalRevisionDocument>("ProposalRevision", schema);

export interface ProposalReviewDocument {
  _id: Types.ObjectId;
  reviewId: string;
  proposalId: string;
  projectId: string;
  status: "approved" | "returned";
  note: string;
  reviewedBy: Types.ObjectId;
  createdAt: Date;
}

const reviewSchema = new Schema<ProposalReviewDocument>({
  reviewId: { type: String, required: true, unique: true },
  proposalId: { type: String, required: true, index: true },
  projectId: { type: String, required: true, index: true },
  status: { type: String, enum: ["approved", "returned"], required: true },
  note: { type: String, required: true, trim: true, maxlength: 2000 },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now, index: true },
}, { versionKey: false });
export const ProposalReview = model<ProposalReviewDocument>("ProposalReview", reviewSchema);
