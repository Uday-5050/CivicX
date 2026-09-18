import { Schema, Types, model } from "mongoose";

export interface NotificationDocument {
  _id: Types.ObjectId;
  notificationId: string;
  dedupeKey: string;
  recipientUserId: Types.ObjectId;
  eventType: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<NotificationDocument>({
  notificationId: { type: String, required: true, unique: true },
  dedupeKey: { type: String, required: true, unique: true },
  recipientUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  eventType: { type: String, required: true, trim: true, maxlength: 120 },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  body: { type: String, required: true, trim: true, maxlength: 2000 },
  payload: { type: Schema.Types.Mixed, default: {} },
  readAt: { type: Date },
}, { timestamps: true });

schema.index({ recipientUserId: 1, readAt: 1, createdAt: -1 });
export const Notification = model<NotificationDocument>("Notification", schema);
