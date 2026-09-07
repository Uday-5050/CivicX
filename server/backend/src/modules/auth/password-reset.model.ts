import { Schema, Types, model } from "mongoose";
export interface PasswordResetDocument { _id: Types.ObjectId; userId: Types.ObjectId; tokenHash: string; expiresAt: Date; usedAt?: Date; }
const schema = new Schema<PasswordResetDocument>({ userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }, tokenHash: { type: String, required: true, unique: true, select: false }, expiresAt: { type: Date, required: true, index: { expires: 0 } }, usedAt: Date }, { timestamps: true });
export const PasswordReset = model<PasswordResetDocument>("PasswordReset", schema);
