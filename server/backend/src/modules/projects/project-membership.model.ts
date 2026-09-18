import { Schema, Types, model } from "mongoose";

export type ProjectMembershipRole = "lead" | "mentor" | "student" | "industry_partner";
export type ProjectMembershipStatus = "active" | "suspended";

export interface ProjectMembershipDocument {
  _id: Types.ObjectId;
  projectId: string;
  userId: Types.ObjectId;
  institutionId: Types.ObjectId;
  role: ProjectMembershipRole;
  status: ProjectMembershipStatus;
  department?: string;
  addedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ProjectMembershipDocument>({
  projectId: { type: String, required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  institutionId: { type: Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
  role: { type: String, enum: ["lead", "mentor", "student", "industry_partner"], required: true },
  status: { type: String, enum: ["active", "suspended"], default: "active", index: true },
  department: { type: String, trim: true, maxlength: 160 },
  addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });

schema.index({ projectId: 1, userId: 1 }, { unique: true });
schema.index({ projectId: 1, status: 1, role: 1 });
export const ProjectMembership = model<ProjectMembershipDocument>("ProjectMembership", schema);
