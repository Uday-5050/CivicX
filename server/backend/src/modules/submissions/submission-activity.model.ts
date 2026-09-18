import { Schema, Types, model } from "mongoose";

export type SubmissionActivityVisibility = "public" | "private";

export interface SubmissionActivityDocument {
  _id: Types.ObjectId;
  eventId: string;
  submissionId: Types.ObjectId;
  eventType: string;
  message: string;
  visibility: SubmissionActivityVisibility;
  actorId?: Types.ObjectId;
  actorRole?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const schema = new Schema<SubmissionActivityDocument>({
  eventId: { type: String, required: true, unique: true },
  submissionId: { type: Schema.Types.ObjectId, ref: "Submission", required: true, index: true },
  eventType: { type: String, required: true, trim: true, maxlength: 100 },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  visibility: { type: String, enum: ["public", "private"], default: "public", index: true },
  actorId: { type: Schema.Types.ObjectId, ref: "User" },
  actorRole: { type: String },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true },
}, { versionKey: false });

schema.index({ submissionId: 1, visibility: 1, createdAt: 1 });
export const SubmissionActivity = model<SubmissionActivityDocument>("SubmissionActivity", schema);
