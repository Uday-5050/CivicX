import { Schema, Types, model } from "mongoose";

export interface ClassificationResultDocument {
  _id: Types.ObjectId;
  resultId: string;
  jobId: string;
  submissionId: Types.ObjectId;
  provider: string;
  requestedProvider?: string;
  model?: string;
  promptVersion?: string;
  inputHash?: string;
  revision: number;
  durationMs?: number;
  fallbackReason?: string;
  category: string;
  priority: "low" | "medium" | "high";
  summary: string;
  signals: string[];
  createdAt: Date;
}

const schema = new Schema<ClassificationResultDocument>({
  resultId: { type: String, required: true, unique: true },
  jobId: { type: String, required: true, unique: true, index: true },
  submissionId: { type: Schema.Types.ObjectId, ref: "Submission", required: true, index: true },
  provider: { type: String, required: true, trim: true },
  requestedProvider: { type: String, trim: true },
  model: { type: String, trim: true },
  promptVersion: { type: String, trim: true },
  inputHash: { type: String, trim: true },
  revision: { type: Number, required: true, min: 1 },
  durationMs: { type: Number, min: 0 },
  fallbackReason: { type: String, maxlength: 500 },
  category: { type: String, required: true, trim: true, maxlength: 120 },
  priority: { type: String, enum: ["low", "medium", "high"], required: true },
  summary: { type: String, required: true, trim: true, maxlength: 500 },
  signals: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now, index: true },
}, { versionKey: false });

schema.index({ submissionId: 1, revision: -1 }, { unique: true });

export const ClassificationResult = model<ClassificationResultDocument>("ClassificationResult", schema);
