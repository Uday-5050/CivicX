import { createHash, randomUUID } from "node:crypto";
import { Types, type HydratedDocument } from "mongoose";
import { ConflictError } from "../../utils/errors";
import { Submission } from "../submissions/submission.model";
import { ClassificationJob, type ClassificationJobDocument } from "./classification-job.model";
import { ClassificationResult } from "./classification-result.model";
import { AiProviderError, classifyDeterministic as classifyWithRules, classifyWithProvider, type AiClassificationRequest } from "../../adapters/ai";
import config from "../../config";

export interface ClassificationInput { title: string; description: string; domain: string; }
export interface DeterministicClassification { category: string; priority: "low" | "medium" | "high"; summary: string; signals: string[]; }
export const AI_PROMPT_VERSION = "classification-v1";
export function classifyDeterministic(input: ClassificationInput): DeterministicClassification { return classifyWithRules(input); }

export async function enqueueClassificationJob(submissionId: string, provider = config.aiProvider === "mock" ? "rules" : config.aiProvider, options: { force?: boolean; requestedBy?: string; retryReason?: string } = {}) {
  if (!options.force) {
    const existing = await ClassificationJob.findOne({ submissionId }).sort({ createdAt: -1 });
    if (existing) return { record: existing, reused: true };
  }
  const record = await ClassificationJob.create({ jobId: randomUUID(), submissionId, provider, requestedBy: options.requestedBy && Types.ObjectId.isValid(options.requestedBy) ? options.requestedBy : undefined, retryReason: options.retryReason });
  await Submission.updateOne({ _id: submissionId }, { $set: { analysis: { status: "pending" } } });
  return { record, reused: false };
}

async function failJob(job: HydratedDocument<ClassificationJobDocument>, error: unknown) {
  job.status = "failed"; job.lastError = error instanceof Error ? error.message.slice(0, 2000) : "Classification failed"; job.leaseUntil = undefined; job.lockedBy = undefined;
  await job.save();
  await Submission.updateOne({ _id: job.submissionId }, { $set: { "analysis.status": "failed", "analysis.error": job.lastError } });
  return job;
}

export async function processClassificationJob(jobId: string, workerId = "inline") {
  const now = new Date();
  const claimed = await ClassificationJob.findOneAndUpdate(
    { jobId, status: { $in: ["pending", "failed"] }, availableAt: { $lte: now }, $or: [{ leaseUntil: { $exists: false } }, { leaseUntil: { $lte: now } }] },
    { $set: { status: "running", startedAt: now, leaseUntil: new Date(now.getTime() + config.aiLeaseMs), lockedBy: workerId, lastError: undefined }, $inc: { attempts: 1 } }, { new: true },
  );
  if (!claimed) { const existing = await ClassificationJob.findOne({ jobId }); if (!existing) throw ConflictError("Classification job not found"); return existing; }
  const submission = await Submission.findById(claimed.submissionId);
  if (!submission) return failJob(claimed, new Error("Submission not found"));
  await Submission.updateOne({ _id: submission._id }, { $set: { "analysis.status": "processing" }, $unset: { "analysis.error": 1 } });
  const started = Date.now();
  try {
    const input: AiClassificationRequest = { title: submission.title, description: submission.description, domain: submission.domain };
    let result: DeterministicClassification; let resultProvider: string; let fallbackReason: string | undefined;
    try { const classified = await classifyWithProvider(input, claimed.provider); result = classified.result; resultProvider = classified.provider; }
    catch (error) {
      if (claimed.provider === "failing") throw error;
      if (error instanceof AiProviderError && error.retryable && claimed.attempts < config.aiMaxAttempts) {
        const delayMs = Math.min(30_000, 1000 * (2 ** Math.max(0, claimed.attempts - 1)));
        claimed.status = "pending"; claimed.availableAt = new Date(Date.now() + delayMs); claimed.lastError = error.code; claimed.leaseUntil = undefined; claimed.lockedBy = undefined;
        await claimed.save();
        await Submission.updateOne({ _id: submission._id }, { $set: { "analysis.status": "pending", "analysis.error": "Remote analysis will retry automatically." } });
        return claimed;
      }
      result = classifyWithRules(input); resultProvider = "rules-fallback"; fallbackReason = error instanceof AiProviderError ? error.code : "invalid_provider_response"; claimed.lastError = fallbackReason;
    }
    const latest = await ClassificationResult.findOne({ submissionId: submission._id }).sort({ revision: -1 }).select("revision").lean();
    const revision = (latest?.revision ?? 0) + 1;
    const savedResult = await ClassificationResult.findOneAndUpdate({ jobId: claimed.jobId }, { $setOnInsert: {
      resultId: randomUUID(), jobId: claimed.jobId, submissionId: submission._id, requestedProvider: claimed.provider, provider: resultProvider,
      model: resultProvider.startsWith("rules") ? "local-rules-v1" : config.aiModel, promptVersion: AI_PROMPT_VERSION,
      inputHash: createHash("sha256").update(JSON.stringify(input)).digest("hex"), revision, durationMs: Date.now() - started, fallbackReason, ...result,
    } }, { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true });
    claimed.status = "completed"; claimed.provider = savedResult.provider; claimed.resultId = savedResult.resultId; claimed.completedAt = new Date(); claimed.leaseUntil = undefined; claimed.lockedBy = undefined;
    await claimed.save();
    await Submission.updateOne({ _id: submission._id }, { $set: { domain: savedResult.category, analysis: { status: savedResult.provider === "rules-fallback" ? "fallback" : "completed", category: savedResult.category, priority: savedResult.priority, summary: savedResult.summary, provider: savedResult.provider, revision: savedResult.revision, ...(fallbackReason ? { error: "Remote analysis unavailable; local rules were used." } : {}) } } });
    return claimed;
  } catch (error) { return failJob(claimed, error); }
}

export async function recoverExpiredClassificationJobs() {
  const now = new Date();
  await ClassificationJob.updateMany({ status: "running", leaseUntil: { $lte: now } }, { $set: { status: "pending", availableAt: now }, $unset: { leaseUntil: 1, lockedBy: 1 } });
  const stranded = await Submission.find({ "analysis.status": { $in: ["pending", "processing"] } }).select("_id").limit(100).lean();
  for (const submission of stranded) if (!await ClassificationJob.exists({ submissionId: submission._id, status: { $in: ["pending", "running"] } })) await enqueueClassificationJob(submission._id.toString(), undefined, { force: true });
}

export async function claimAndProcessNextClassificationJob(workerId: string) {
  const job = await ClassificationJob.findOne({ status: "pending", availableAt: { $lte: new Date() }, attempts: { $lt: config.aiMaxAttempts } }).sort({ availableAt: 1, createdAt: 1 });
  if (!job) return false; await processClassificationJob(job.jobId, workerId); return true;
}

export async function getClassificationAnalysis(submissionId: string) {
  const [job, revisions] = await Promise.all([ClassificationJob.findOne({ submissionId }).sort({ createdAt: -1 }).lean(), ClassificationResult.find({ submissionId }).sort({ revision: -1 }).lean()]);
  return { job: job ? { jobId: job.jobId, status: job.status, requestedProvider: job.provider, attempts: job.attempts, availableAt: job.availableAt, lastError: job.lastError, createdAt: job.createdAt, completedAt: job.completedAt } : undefined, current: revisions[0], revisions };
}
