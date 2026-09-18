import { Schema, Types, model } from "mongoose";

export type MembershipRole = "coordinator" | "mentor" | "student" | "partner";
export type MembershipStatus = "pending" | "active" | "suspended";

export interface InstitutionMembershipDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  institutionId: Types.ObjectId;
  role: MembershipRole;
  department?: string;
  status: MembershipStatus;
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<InstitutionMembershipDocument>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  institutionId: { type: Schema.Types.ObjectId, ref: "Institution", required: true },
  role: { type: String, enum: ["coordinator", "mentor", "student", "partner"], required: true },
  department: { type: String, trim: true, maxlength: 160 },
  status: { type: String, enum: ["pending", "active", "suspended"], default: "pending" },
  verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
  verifiedAt: { type: Date },
}, { timestamps: true });

schema.index({ userId: 1, institutionId: 1 }, { unique: true });
schema.index({ institutionId: 1, status: 1, role: 1 });

export const InstitutionMembership = model<InstitutionMembershipDocument>("InstitutionMembership", schema);
