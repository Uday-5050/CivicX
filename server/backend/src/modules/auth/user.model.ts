import { Schema, Types, model } from "mongoose";
import type { AccountStatus, Role } from "./auth.types";

export interface UserDocument { _id: Types.ObjectId; name: string; email: string; passwordHash: string; role: Role; accountStatus: AccountStatus; institutionId?: Types.ObjectId; createdAt: Date; updatedAt: Date; }
const schema = new Schema<UserDocument>({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["citizen", "university", "industry", "admin"], required: true },
  accountStatus: { type: String, enum: ["pending", "active", "suspended"], default: "active" },
  institutionId: { type: Schema.Types.ObjectId, ref: "Institution" },
}, { timestamps: true });
export const User = model<UserDocument>("User", schema);
