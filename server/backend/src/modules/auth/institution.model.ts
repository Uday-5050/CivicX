import { Schema, Types, model } from "mongoose";

export type InstitutionType = "university" | "industry";
export type InstitutionAccountStatus = "pending" | "active" | "suspended";
export type InstitutionProfileStatus = "draft" | "verified";
export type InstitutionMetrics = { patents: number; startupsIncubated: number; fundingLakhs: number; mentorshipHours: number; sector: string; industryType: "large" | "startup" | "msme" | "csr" | "unclassified" };

export interface InstitutionDepartment {
  id: string;
  name: string;
  domains: string[];
  leadUserId?: string;
  active: boolean;
}

export interface InstitutionDocument {
  _id: Types.ObjectId;
  name: string;
  type: InstitutionType;
  accountStatus: InstitutionAccountStatus;
  description: string;
  domains: string[];
  expertise: string[];
  facilities: string[];
  serviceAreas: string[];
  departments: InstitutionDepartment[];
  maxActiveProjects: number;
  acceptingWork: boolean;
  routingReservations: number;
  profileStatus: InstitutionProfileStatus;
  profileVerifiedAt?: Date;
  profileVerifiedBy?: Types.ObjectId;
  metrics?: InstitutionMetrics;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<InstitutionDepartment>({
  id: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  domains: { type: [String], default: [] },
  leadUserId: { type: String },
  active: { type: Boolean, default: true },
}, { _id: false });

const metricsSchema = new Schema<InstitutionMetrics>({
  patents: { type: Number, default: 0 },
  startupsIncubated: { type: Number, default: 0 },
  fundingLakhs: { type: Number, default: 0 },
  mentorshipHours: { type: Number, default: 0 },
  sector: { type: String, default: "Unspecified" },
  industryType: { type: String, enum: ["large", "startup", "msme", "csr", "unclassified"], default: "unclassified" },
}, { _id: false });

const schema = new Schema<InstitutionDocument>({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ["university", "industry"], required: true },
  accountStatus: { type: String, enum: ["pending", "active", "suspended"], default: "pending" },
  description: { type: String, default: "", trim: true, maxlength: 2000 },
  domains: { type: [String], default: [] },
  expertise: { type: [String], default: [] },
  facilities: { type: [String], default: [] },
  serviceAreas: { type: [String], default: [] },
  departments: { type: [departmentSchema], default: [] },
  maxActiveProjects: { type: Number, default: 0, min: 0, max: 10000 },
  acceptingWork: { type: Boolean, default: false },
  routingReservations: { type: Number, default: 0, min: 0 },
  profileStatus: { type: String, enum: ["draft", "verified"], default: "draft" },
  profileVerifiedAt: { type: Date },
  profileVerifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
  metrics: { type: metricsSchema, default: undefined },
}, { timestamps: true });

schema.index({ type: 1, accountStatus: 1, profileStatus: 1, acceptingWork: 1 });
export const Institution = model<InstitutionDocument>("Institution", schema);
