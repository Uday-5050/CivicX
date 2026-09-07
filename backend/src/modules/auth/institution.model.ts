import { Schema, Types, model } from "mongoose";
export interface InstitutionDocument { _id: Types.ObjectId; name: string; type: "university" | "industry"; accountStatus: "pending" | "active" | "suspended"; createdAt: Date; updatedAt: Date; }
const schema = new Schema<InstitutionDocument>({ name: { type: String, required: true, trim: true }, type: { type: String, enum: ["university", "industry"], required: true }, accountStatus: { type: String, enum: ["pending", "active", "suspended"], default: "pending" } }, { timestamps: true });
export const Institution = model<InstitutionDocument>("Institution", schema);
