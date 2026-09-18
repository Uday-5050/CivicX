import { Schema, Types, model } from "mongoose";

export type ClassificationJobStatus = "pending" | "running" | "completed" | "failed";

export interface ClassificationJobDocument {
  _id: Types.ObjectId;
  jobId: string;
  submissionId: Types.ObjectId;
  provider: string;
  status: ClassificationJobStatus;
  attempts: number;
  availableAt: Date;
  lastError?: string;
  resultId?: string;
  startedAt?: Date;
  completedAt?: Date;
  leaseUntil?: Date;
  lockedBy?: string;
  requestedBy?: Types.ObjectId;
  retryReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ClassificationJobDocument>({
  jobId: { type: String, required: true, unique: true },
  submissionId: { type: Schema.Types.ObjectId, ref: "Submission", required: true, index: true },
  provider: { type: String, required: true, trim: true, maxlength: 80 },
  status: { type: String, enum: ["pending", "running", "completed", "failed"], default: "pending", index: true },
  attempts: { type: Number, default: 0, min: 0 },
  availableAt: { type: Date, default: Date.now, index: true },
  lastError: { type: String, maxlength: 2000 },
  resultId: { type: String },
  startedAt: { type: Date },
  completedAt: { type: Date },
  leaseUntil: { type: Date, index: true },
  lockedBy: { type: String, maxlength: 120 },
  requestedBy: { type: Schema.Types.ObjectId, ref: "User" },
  retryReason: { type: String, maxlength: 500 },
}, { timestamps: true });

schema.index({ status: 1, availableAt: 1 });
schema.index({ status: 1, leaseUntil: 1 });
export const ClassificationJob = model<ClassificationJobDocument>("ClassificationJob", schema);
