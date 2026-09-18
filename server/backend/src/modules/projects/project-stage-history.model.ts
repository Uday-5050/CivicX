import { Schema, model } from "mongoose";
import type { ProjectStage } from "./project.model";

export type ProjectStageEntrySource = "acceptance" | "advancement" | "reopen" | "migration";

export interface ProjectStageHistoryDocument {
  eventId: string;
  projectId: string;
  stage: ProjectStage;
  enteredAt: Date;
  source: ProjectStageEntrySource;
}

const schema = new Schema<ProjectStageHistoryDocument>({
  eventId: { type: String, required: true, unique: true },
  projectId: { type: String, required: true, index: true },
  stage: { type: String, required: true, enum: ["proposed", "funded", "prototyping", "piloted", "deployed"] },
  enteredAt: { type: Date, required: true, default: Date.now, index: true },
  source: { type: String, required: true, enum: ["acceptance", "advancement", "reopen", "migration"] },
}, { versionKey: false });

schema.index({ projectId: 1, stage: 1 }, { unique: true });
export const ProjectStageHistory = model<ProjectStageHistoryDocument>("ProjectStageHistory", schema);
