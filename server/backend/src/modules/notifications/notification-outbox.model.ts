import { Schema, Types, model } from "mongoose";

export type NotificationOutboxStatus = "pending" | "processing" | "sent" | "failed";

export interface NotificationOutboxDocument {
  _id: Types.ObjectId;
  notificationId: string;
  dedupeKey: string;
  recipientUserId: Types.ObjectId;
  eventType: string;
  payload: Record<string, unknown>;
  status: NotificationOutboxStatus;
  attempts: number;
  availableAt: Date;
  lastError?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<NotificationOutboxDocument>({
  notificationId: { type: String, required: true, unique: true },
  dedupeKey: { type: String, required: true, unique: true },
  recipientUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  eventType: { type: String, required: true, trim: true, maxlength: 120 },
  payload: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ["pending", "processing", "sent", "failed"], default: "pending", index: true },
  attempts: { type: Number, default: 0, min: 0 },
  availableAt: { type: Date, default: Date.now, index: true },
  lastError: { type: String, maxlength: 2000 },
  processedAt: { type: Date },
}, { timestamps: true });

schema.index({ status: 1, availableAt: 1 });

export const NotificationOutbox = model<NotificationOutboxDocument>("NotificationOutbox", schema);
