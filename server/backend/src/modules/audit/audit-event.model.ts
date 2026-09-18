import { Schema, Types, model } from "mongoose";

export interface AuditEventDocument {
  _id: Types.ObjectId;
  eventId: string;
  actorId?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  requestId?: string;
  createdAt: Date;
}

const schema = new Schema<AuditEventDocument>({
  eventId: { type: String, required: true, unique: true },
  actorId: { type: String },
  actorRole: { type: String },
  action: { type: String, required: true, trim: true, maxlength: 120 },
  entityType: { type: String, required: true, trim: true, maxlength: 80 },
  entityId: { type: String, required: true, trim: true, maxlength: 200 },
  metadata: { type: Schema.Types.Mixed, default: {} },
  requestId: { type: String },
  createdAt: { type: Date, default: Date.now, index: true },
}, { versionKey: false });

schema.index({ entityType: 1, entityId: 1, createdAt: -1 });
schema.index({ actorId: 1, createdAt: -1 });

export const AuditEvent = model<AuditEventDocument>("AuditEvent", schema);
