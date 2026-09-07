import { Schema, Types, model } from "mongoose";
export interface RefreshSessionDocument { _id: Types.ObjectId; userId: Types.ObjectId; tokenHash: string; client: "web" | "mobile"; expiresAt: Date; revokedAt?: Date; }
const schema = new Schema<RefreshSessionDocument>({ userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }, tokenHash: { type: String, required: true, unique: true, select: false }, client: { type: String, enum: ["web", "mobile"], required: true }, expiresAt: { type: Date, required: true, index: { expires: 0 } }, revokedAt: Date }, { timestamps: true });
export const RefreshSession = model<RefreshSessionDocument>("RefreshSession", schema);
