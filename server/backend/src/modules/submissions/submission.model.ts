import { Schema, Types, model } from "mongoose";

export interface SubmissionDocument {
  _id: Types.ObjectId;
  submitterId: Types.ObjectId;
  idempotencyKey: string;
  title: string;
  description: string;
  domain: string;
  location: string;
  submitterType: "citizen";
  attachments: Array<{ id: string; name: string; type: string; size: number; previewUrl: string }>;
  status: "submitted" | "under_review" | "assigned" | "in_progress" | "resolved";
  disposition: "active" | "duplicate" | "rejected" | "referred";
  duplicateOf?: Types.ObjectId;
  moderationUpdatedBy?: Types.ObjectId;
  moderationUpdatedAt?: Date;
  analysis: { status: "pending" | "processing" | "completed" | "fallback" | "failed"; category?: string; priority?: "low" | "medium" | "high"; summary?: string; error?: string; provider?: string; revision?: number };
  comments: Array<{ id: string; authorId: Types.ObjectId; text: string; createdAt: Date }>;
  upvotes: number;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<SubmissionDocument>({
  submitterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  idempotencyKey: { type: String, required: true, maxlength: 100 },
  title: { type: String, required: true, maxlength: 120 },
  description: { type: String, required: true, maxlength: 2000 },
  domain: { type: String, required: true, maxlength: 120 },
  location: { type: String, required: true, maxlength: 300 },
  submitterType: { type: String, enum: ["citizen"], default: "citizen" },
  attachments: [new Schema({ id: String, name: String, type: String, size: Number, previewUrl: String }, { _id: false })],
  status: { type: String, enum: ["submitted", "under_review", "assigned", "in_progress", "resolved"], default: "submitted" },
  disposition: { type: String, enum: ["active", "duplicate", "rejected", "referred"], default: "active", index: true },
  duplicateOf: { type: Schema.Types.ObjectId, ref: "Submission", index: true, sparse: true },
  moderationUpdatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  moderationUpdatedAt: { type: Date },
  analysis: { type: new Schema({ status: { type: String, enum: ["pending", "processing", "completed", "fallback", "failed"] }, category: String, priority: { type: String, enum: ["low", "medium", "high"] }, summary: String, error: String, provider: String, revision: Number }, { _id: false }), default: { status: "pending" } },
  comments: [new Schema({ id: String, authorId: Schema.Types.ObjectId, text: String, createdAt: Date }, { _id: false })],
  upvotes: { type: Number, default: 0 },
}, { timestamps: true, versionKey: false });

schema.index({ submitterId: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ submitterId: 1, createdAt: -1 });
schema.index({ disposition: 1, status: 1, createdAt: -1 });
export const Submission = model<SubmissionDocument>("Submission", schema);
