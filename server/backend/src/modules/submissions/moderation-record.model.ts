import { Schema, Types, model } from "mongoose";

export type ModerationDecision = "reviewed" | "information_requested" | "marked_duplicate" | "rejected" | "referred" | "restored";

export interface ModerationRecordDocument {
  _id: Types.ObjectId;
  submissionId: Types.ObjectId;
  decision: ModerationDecision;
  note?: string;
  category?: string;
  priority?: "low" | "medium" | "high";
  duplicateOf?: Types.ObjectId;
  actorId: Types.ObjectId;
  requestId?: string;
  createdAt: Date;
}

const schema = new Schema<ModerationRecordDocument>({
  submissionId: { type: Schema.Types.ObjectId, ref: "Submission", required: true, index: true },
  decision: { type: String, enum: ["reviewed", "information_requested", "marked_duplicate", "rejected", "referred", "restored"], required: true },
  note: { type: String, trim: true, maxlength: 2000 },
  category: { type: String, trim: true, maxlength: 120 },
  priority: { type: String, enum: ["low", "medium", "high"] },
  duplicateOf: { type: Schema.Types.ObjectId, ref: "Submission" },
  actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  requestId: { type: String },
  createdAt: { type: Date, default: Date.now, index: true },
}, { versionKey: false });

schema.index({ submissionId: 1, createdAt: -1 });
export const ModerationRecord = model<ModerationRecordDocument>("ModerationRecord", schema);
