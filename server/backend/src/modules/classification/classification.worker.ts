import { randomUUID } from "node:crypto";
import config from "../../config";
import { logger } from "../../middleware/logger";
import { claimAndProcessNextClassificationJob, recoverExpiredClassificationJobs } from "./classification.service";

export function startClassificationWorker() {
  if (!config.aiWorkerEnabled) return () => undefined;
  const workerId = `classification-${process.pid}-${randomUUID().slice(0, 8)}`; let running = false;
  const tick = async () => { if (running) return; running = true; try { await recoverExpiredClassificationJobs(); while (await claimAndProcessNextClassificationJob(workerId)) { /* drain serially */ } } catch (error) { logger.error({ err: error }, "Classification worker tick failed"); } finally { running = false; } };
  void tick(); const timer = setInterval(() => void tick(), Math.max(500, config.aiWorkerPollMs)); timer.unref();
  logger.info({ workerId, provider: config.aiProvider, model: config.aiModel }, "Classification worker started");
  return () => clearInterval(timer);
}
