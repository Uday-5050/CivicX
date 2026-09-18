import { Schema, Types, model } from "mongoose";

export type RoutingAssignmentStatus = "pending" | "accepted" | "declined" | "cancelled";

export interface RoutingMatchComponent {
  name: "domain" | "expertise" | "facilities" | "serviceArea" | "capacity";
  points: number;
  maximum: number;
  reasons: string[];
}

export interface RoutingAssignmentDocument {
  _id: Types.ObjectId;
  assignmentId: string;
  submissionId: Types.ObjectId;
  institutionId: Types.ObjectId;
  departmentId: string;
  departmentName: string;
  status: RoutingAssignmentStatus;
  version: number;
  isActive: boolean;
  reason?: string;
  matchSnapshot: { score: number; components: RoutingMatchComponent[]; generatedAt: Date };
  assignedBy: Types.ObjectId;
  decidedBy?: Types.ObjectId;
  decisionReason?: string;
  decidedAt?: Date;
  clarification?: { requestedBy: Types.ObjectId; question: string; requestedAt: Date };
  createdAt: Date;
  updatedAt: Date;
}

const component = new Schema<RoutingMatchComponent>({
  name: { type: String, enum: ["domain", "expertise", "facilities", "serviceArea", "capacity"], required: true },
  points: { type: Number, required: true, min: 0 },
  maximum: { type: Number, required: true, min: 0 },
  reasons: { type: [String], default: [] },
}, { _id: false });

const schema = new Schema<RoutingAssignmentDocument>({
  assignmentId: { type: String, required: true, unique: true, index: true },
  submissionId: { type: Schema.Types.ObjectId, ref: "Submission", required: true, index: true },
  institutionId: { type: Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
  departmentId: { type: String, required: true, trim: true, maxlength: 100 },
  departmentName: { type: String, required: true, trim: true, maxlength: 160 },
  status: { type: String, enum: ["pending", "accepted", "declined", "cancelled"], default: "pending", index: true },
  version: { type: Number, default: 1, min: 1 },
  isActive: { type: Boolean, default: true, index: true },
  reason: { type: String, trim: true, maxlength: 2000 },
  matchSnapshot: { type: new Schema({ score: Number, components: [component], generatedAt: Date }, { _id: false }), required: true },
  assignedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  decidedBy: { type: Schema.Types.ObjectId, ref: "User" },
  decisionReason: { type: String, trim: true, maxlength: 2000 },
  decidedAt: { type: Date },
  clarification: { type: new Schema({ requestedBy: { type: Schema.Types.ObjectId, ref: "User" }, question: { type: String, trim: true, maxlength: 2000 }, requestedAt: Date }, { _id: false }), default: undefined },
}, { timestamps: true, versionKey: false });

schema.index({ submissionId: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
schema.index({ institutionId: 1, status: 1, createdAt: -1 });

export const RoutingAssignment = model<RoutingAssignmentDocument>("RoutingAssignment", schema);
