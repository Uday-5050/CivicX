import { Schema, Types, model } from "mongoose";

export type InformationRequestStatus = "open" | "answered" | "cancelled";

export interface InformationRequestDocument {
  _id: Types.ObjectId;
  requestId: string;
  submissionId: Types.ObjectId;
  question: string;
  status: InformationRequestStatus;
  requestedBy: Types.ObjectId;
  requestedAt: Date;
  answer?: string;
  answeredBy?: Types.ObjectId;
  answeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<InformationRequestDocument>({
  requestId: { type: String, required: true, unique: true },
  submissionId: { type: Schema.Types.ObjectId, ref: "Submission", required: true, index: true },
  question: { type: String, required: true, trim: true, maxlength: 2000 },
  status: { type: String, enum: ["open", "answered", "cancelled"], default: "open", index: true },
  requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  requestedAt: { type: Date, default: Date.now },
  answer: { type: String, trim: true, maxlength: 2000 },
  answeredBy: { type: Schema.Types.ObjectId, ref: "User" },
  answeredAt: { type: Date },
}, { timestamps: true, versionKey: false });

schema.index({ submissionId: 1, status: 1, createdAt: -1 });
export const InformationRequest = model<InformationRequestDocument>("InformationRequest", schema);
