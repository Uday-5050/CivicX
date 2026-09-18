import { randomUUID } from "node:crypto";
import type { ClientSession } from "mongoose";
import { createIdempotent } from "../../utils/atomic";
import { ProjectStageHistory, type ProjectStageEntrySource } from "./project-stage-history.model";
import type { ProjectStage } from "./project.model";

export async function recordProjectStage(projectId: string, stage: ProjectStage, source: ProjectStageEntrySource, session?: ClientSession) {
  const result = await createIdempotent(
    () => ProjectStageHistory.findOne({ projectId, stage }).session(session ?? null).exec(),
    async () => {
      const [entry] = await ProjectStageHistory.create([{ eventId: randomUUID(), projectId, stage, source, enteredAt: new Date() }], { session });
      return entry;
    },
  );
  return result.record;
}
