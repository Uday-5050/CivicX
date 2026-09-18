import { Router, type Request } from "express";
import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { requireAuth, requireRole } from "../auth/auth.middleware";
import { Institution } from "../auth/institution.model";
import { User } from "../auth/user.model";
import { Submission } from "../submissions/submission.model";
import { Project, projectStages } from "../projects/project.model";
import { MilestoneEvidence } from "../projects/milestone-evidence.model";
import { MilestoneReview } from "../projects/milestone-review.model";
import { ProjectClosure } from "../projects/project-closure.model";
import { z } from "zod";
import { sendSuccess } from "../../utils/response";
import { ConflictError, NotFoundError, ValidationError } from "../../utils/errors";
import { AuditEvent } from "../audit/audit-event.model";
import { recordAuditEvent } from "../audit/audit.service";
import { ModerationRecord, type ModerationDecision } from "../submissions/moderation-record.model";
import { InformationRequest } from "../submissions/information-request.model";
import { SubmissionActivity } from "../submissions/submission-activity.model";
import { recordSubmissionActivity } from "../submissions/submission-activity.service";
import { RoutingAssignment } from "../routing/routing-assignment.model";
import { createRoutingAssignment, recommendUniversities, serializeRoutingAssignment } from "../routing/routing.service";
import { withMongoTransaction } from "../../utils/transactions";
import { recordProjectStage } from "../projects/project-stage-history.service";
import { aiProviderStatus } from "../../adapters/ai";
import { enqueueClassificationJob, getClassificationAnalysis } from "../classification/classification.service";
import config from "../../config";

const router = Router();
router.use(requireAuth, requireRole("admin"));

const id = (value: string, label: string): string => {
  if (!Types.ObjectId.isValid(value)) throw NotFoundError(`${label} not found`);
  return value;
};

const reviewSchema = z.object({
  decision: z.enum(["reviewed", "information_requested", "marked_duplicate", "rejected", "referred", "restored"]).default("reviewed"),
  note: z.string().trim().max(2000).optional(),
  category: z.string().trim().min(1).max(120).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  duplicateOf: z.string().optional(),
  question: z.string().trim().min(1).max(2000).optional(),
}).strict();

const routeSchema = z.object({
  institutionId: z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid university id"),
  departmentId: z.string().trim().min(1).max(100),
  reason: z.string().trim().max(2000).optional(),
}).strict();
const milestoneReviewSchema = z.object({ evidenceId: z.string().uuid(), status: z.enum(["approved", "rejected"]), note: z.string().trim().min(1).max(2000), expectedVersion: z.number().int().positive() }).strict();
const analysisRetrySchema = z.object({ reason: z.string().trim().min(3).max(500), expectedRevision: z.number().int().min(0) }).strict();

async function applyModeration(input: z.infer<typeof reviewSchema>, submission: InstanceType<typeof Submission>, req: Request) {
  const decision = input.decision as ModerationDecision;
  if (submission.status === "resolved" && decision !== "restored") throw ConflictError("A resolved submission cannot be moderated");
  let duplicateOf: Types.ObjectId | undefined;
  if (decision === "marked_duplicate") {
    if (!input.duplicateOf || !Types.ObjectId.isValid(input.duplicateOf)) throw ValidationError("A valid duplicate report is required");
    if (input.duplicateOf === submission._id.toString()) throw ValidationError("A report cannot be a duplicate of itself");
    const duplicate = await Submission.exists({ _id: input.duplicateOf });
    if (!duplicate) throw NotFoundError("Duplicate report not found");
    duplicateOf = new Types.ObjectId(input.duplicateOf);
  }
  if (decision === "information_requested" && !input.question) throw ValidationError("A question is required when requesting information");
  if (["reviewed", "information_requested", "referred"].includes(decision) && submission.status === "submitted") submission.status = "under_review";
  if (decision === "restored") submission.disposition = "active";
  if (decision === "marked_duplicate") { submission.disposition = "duplicate"; submission.duplicateOf = duplicateOf; }
  if (decision === "rejected") submission.disposition = "rejected";
  if (decision === "referred") submission.disposition = "referred";
  if (input.category !== undefined) submission.analysis.category = input.category;
  if (input.priority !== undefined) submission.analysis.priority = input.priority;
  submission.moderationUpdatedBy = new Types.ObjectId(req.auth!.userId);
  submission.moderationUpdatedAt = new Date();
  await submission.save();
  const record = await ModerationRecord.create({ submissionId: submission._id, decision, note: input.note, category: input.category, priority: input.priority, duplicateOf, actorId: req.auth!.userId, requestId: String(req.id) });
  let informationRequest: InstanceType<typeof InformationRequest> | undefined;
  if (decision === "information_requested" && input.question) {
    informationRequest = await InformationRequest.create({ requestId: randomUUID(), submissionId: submission._id, question: input.question, requestedBy: req.auth!.userId });
  }
  const messages: Record<ModerationDecision, string> = {
    reviewed: "Report reviewed and returned to the processing queue",
    information_requested: "Administrator requested more information",
    marked_duplicate: "Report was linked to a related report",
    rejected: "Report was reviewed and closed",
    referred: "Report was referred for further handling",
    restored: "Report was restored for processing",
  };
  await recordSubmissionActivity({ submissionId: submission._id, eventType: decision, message: messages[decision], actorId: req.auth!.userId, actorRole: req.auth!.role, metadata: informationRequest ? { requestId: informationRequest.requestId } : {} });
  return { record, informationRequest };
}

const serializeInstitution = async (institution: InstanceType<typeof Institution>) => ({
  id: institution._id.toString(), name: institution.name, type: institution.type,
  accountStatus: institution.accountStatus, createdAt: institution.createdAt,
  users: await User.countDocuments({ institutionId: institution._id }),
});

router.get("/institutions", async (_req, res, next) => {
  try { sendSuccess(res, await Promise.all((await Institution.find().sort({ createdAt: -1 })).map(serializeInstitution))); } catch (error) { next(error); }
});

router.post("/institutions/:id/status", async (req, res, next) => {
  try {
    const status = req.body?.status;
    if (status !== "active" && status !== "suspended") throw ValidationError("Status must be active or suspended");
    const institution = await Institution.findByIdAndUpdate(id(String(req.params.id), "Institution"), { $set: { accountStatus: status } }, { new: true });
    if (!institution) throw NotFoundError("Institution not found");
    await User.updateMany({ institutionId: institution._id }, { $set: { accountStatus: status } });
    await recordAuditEvent({ actorId: req.auth!.userId, actorRole: req.auth!.role, action: "institution.status_changed", entityType: "institution", entityId: institution._id.toString(), metadata: { status }, requestId: String(req.id) });
    sendSuccess(res, await serializeInstitution(institution));
  } catch (error) { next(error); }
});

router.get("/submissions", async (_req, res, next) => {
  try {
    const reports = await Submission.find().sort({ createdAt: -1 }).limit(100);
    sendSuccess(res, reports.map((report) => ({ id: report._id.toString(), title: report.title, description: report.description, domain: report.domain, location: report.location, status: report.status, createdAt: report.createdAt })));
  } catch (error) { next(error); }
});

router.get("/moderation", async (_req, res, next) => {
  try {
    const reports = await Submission.find({ status: { $in: ["submitted", "under_review"] } }).sort({ createdAt: -1 }).limit(100);
    sendSuccess(res, reports.map((report) => ({ id: report._id.toString(), title: report.title, reason: report.status === "submitted" ? "Awaiting administrator review" : "Under administrator review", reporter: "Citizen report", status: "open", createdAt: report.createdAt })));
  } catch (error) { next(error); }
});

router.get("/submissions/:id", async (req, res, next) => {
  try {
    const submission = await Submission.findById(id(String(req.params.id), "Submission"));
    if (!submission) throw NotFoundError("Submission not found");
    const [moderation, informationRequests, timeline, routing] = await Promise.all([
      ModerationRecord.find({ submissionId: submission._id }).sort({ createdAt: -1 }).lean(),
      InformationRequest.find({ submissionId: submission._id }).sort({ createdAt: -1 }).lean(),
      SubmissionActivity.find({ submissionId: submission._id }).sort({ createdAt: 1 }).lean(),
      RoutingAssignment.find({ submissionId: submission._id }).sort({ createdAt: -1 }).lean(),
    ]);
    sendSuccess(res, { submission: submission.toObject(), moderation, informationRequests, timeline, routing: routing.map(serializeRoutingAssignment) });
  } catch (error) { next(error); }
});

router.get("/ai/status", (_req, res) => {
  const status = aiProviderStatus();
  sendSuccess(res, { provider: status.provider, model: status.model, configured: status.configured, mode: status.mode, workerEnabled: config.aiWorkerEnabled });
});

router.get("/submissions/:id/analysis", async (req, res, next) => {
  try {
    const submissionId = id(String(req.params.id), "Submission");
    if (!await Submission.exists({ _id: submissionId })) throw NotFoundError("Submission not found");
    const analysis = await getClassificationAnalysis(submissionId);
    sendSuccess(res, analysis);
  } catch (error) { next(error); }
});

router.post("/submissions/:id/analysis/retry", async (req, res, next) => {
  try {
    const submissionId = id(String(req.params.id), "Submission"); const input = analysisRetrySchema.parse(req.body ?? {});
    const submission = await Submission.findById(submissionId); if (!submission) throw NotFoundError("Submission not found");
    if ((submission.analysis.revision ?? 0) !== input.expectedRevision) throw ConflictError("Analysis changed. Refresh and retry.");
    const current = await getClassificationAnalysis(submissionId);
    if (current.job && ["pending", "running"].includes(current.job.status)) { sendSuccess(res, current.job); return; }
    const job = await enqueueClassificationJob(submissionId, undefined, { force: true, requestedBy: req.auth!.userId, retryReason: input.reason });
    await recordAuditEvent({ actorId: req.auth!.userId, actorRole: req.auth!.role, action: "submission.analysis_retried", entityType: "submission", entityId: submissionId, metadata: { reason: input.reason, jobId: job.record.jobId }, requestId: String(req.id) });
    sendSuccess(res, { jobId: job.record.jobId, status: job.record.status, requestedProvider: job.record.provider, attempts: job.record.attempts }, 202);
  } catch (error) { next(error); }
});

router.post("/moderation/:id", async (req, res, next) => {
  try {
    const status = String(req.body?.status); if (status !== "resolved" && status !== "dismissed") throw ValidationError("Status must be resolved or dismissed");
    const submission = await Submission.findById(id(String(req.params.id), "Submission")); if (!submission) throw NotFoundError("Submission not found");
    await applyModeration({ decision: status === "resolved" ? "reviewed" : "rejected", note: req.body?.note }, submission, req);
    sendSuccess(res, { id: submission._id.toString(), title: submission.title, reason: status === "resolved" ? "Reviewed; ready to route" : "Retained without routing", reporter: "Citizen report", status, createdAt: submission.createdAt });
  } catch (error) { next(error); }
});

router.get("/audit", async (_req, res, next) => {
  try {
    const events = await AuditEvent.find().sort({ createdAt: -1 }).limit(100).lean();
    sendSuccess(res, events.map(({ _id, ...event }) => ({ ...event, id: _id.toString() })));
  } catch (error) { next(error); }
});

router.get("/reports", async (_req, res, next) => {
  try {
    const rows = await Submission.aggregate([{ $group: { _id: { domain: "$domain", district: "$location", status: "$status" }, count: { $sum: 1 } } }, { $sort: { "_id.domain": 1 } }]);
    sendSuccess(res, rows.map((row) => ({ id: `${row._id.domain}-${row._id.district}-${row._id.status}`, domain: row._id.domain, district: row._id.district, status: row._id.status, count: row.count })));
  } catch (error) { next(error); }
});

// The moderation queue is deliberately non-destructive: administrators can
// review and route records without deleting a citizen's original report.
router.post("/submissions/:id/review", async (req, res, next) => {
  try {
    const submission = await Submission.findById(id(String(req.params.id), "Submission"));
    if (!submission) throw NotFoundError("Submission not found");
    const input = reviewSchema.parse(req.body ?? {});
    const result = await applyModeration(input, submission, req);
    await recordAuditEvent({ actorId: req.auth!.userId, actorRole: req.auth!.role, action: `submission.${input.decision}`, entityType: "submission", entityId: submission._id.toString(), metadata: { disposition: submission.disposition }, requestId: String(req.id) });
    sendSuccess(res, { id: submission._id.toString(), status: submission.status, disposition: submission.disposition, decision: input.decision, moderationId: result.record._id.toString(), informationRequestId: result.informationRequest?.requestId });
  } catch (error) { next(error); }
});

router.get("/university-recommendations/:id", async (req, res, next) => {
  try {
    const submissionId = id(String(req.params.id), "Submission");
    if (!await Submission.exists({ _id: submissionId })) throw NotFoundError("Submission not found");
    sendSuccess(res, await recommendUniversities(submissionId));
  } catch (error) { next(error); }
});

// Routes one reviewed citizen report to one approved university. The university
// decides whether to accept it and supplies its actual team/proposal afterwards.
router.post("/submissions/:id/route", async (req, res, next) => {
  try {
    const submissionId = id(String(req.params.id), "Submission");
    const input = routeSchema.parse(req.body ?? {});
    const assignment = await createRoutingAssignment({ submissionId, institutionId: input.institutionId, departmentId: input.departmentId, reason: input.reason, assignedBy: req.auth!.userId });
    await recordSubmissionActivity({ submissionId: assignment.submissionId, eventType: "university_routed", message: "Report routed to a university for evaluation", actorId: req.auth!.userId, actorRole: req.auth!.role, metadata: { assignmentId: assignment.assignmentId, institutionId: assignment.institutionId.toString(), departmentId: assignment.departmentId } });
    await recordAuditEvent({ actorId: req.auth!.userId, actorRole: req.auth!.role, action: "submission.routed", entityType: "routing_assignment", entityId: assignment.assignmentId, metadata: { submissionId, institutionId: input.institutionId, departmentId: input.departmentId }, requestId: String(req.id) });
    sendSuccess(res, serializeRoutingAssignment(assignment), 201);
  } catch (error) { next(error); }
});

router.post("/projects/:id/milestone-reviews", async (req, res, next) => {
  try {
    const input = milestoneReviewSchema.parse(req.body ?? {}); const projectId = String(req.params.id); const project = await Project.findOne({ id: projectId }); if (!project) throw NotFoundError("Project not found");
    const evidence = await MilestoneEvidence.findOne({ evidenceId: input.evidenceId, projectId }); if (!evidence) throw NotFoundError("Milestone evidence not found");
    const currentIndex = projectStages.indexOf(project.currentStage); if (projectStages.indexOf(evidence.targetStage) !== currentIndex + 1) throw ValidationError("Evidence must target the next milestone"); if (project.version !== input.expectedVersion) throw ConflictError("This project changed. Refresh and retry."); if (evidence.status !== "pending") throw ConflictError("This evidence has already been reviewed");
    const result = await withMongoTransaction(async (session) => {
      const updatedEvidence = await MilestoneEvidence.findOneAndUpdate({ evidenceId: input.evidenceId, status: "pending" }, { $set: { status: input.status } }, { new: true, session }); if (!updatedEvidence) throw ConflictError("This evidence has already been reviewed");
      const updatedProject = await Project.findOneAndUpdate({ id: projectId, version: input.expectedVersion }, { $inc: { version: 1 }, $set: { [`evidence.${updatedEvidence.targetStage}.review`]: { status: input.status, note: input.note, reviewedBy: req.auth!.userId, reviewedAt: new Date() } } }, { new: true, session }); if (!updatedProject) throw ConflictError("This project changed. Refresh and retry.");
      const [review] = await MilestoneReview.create([{ reviewId: randomUUID(), evidenceId: updatedEvidence.evidenceId, projectId, targetStage: updatedEvidence.targetStage, status: input.status, note: input.note, reviewedBy: req.auth!.userId }], { session }); return { evidence: updatedEvidence, review, project: updatedProject };
    });
    sendSuccess(res, { evidence: result.evidence, review: result.review, project: { id: result.project.id, currentStage: result.project.currentStage, version: result.project.version } });
  } catch (error) { next(error); }
});

const closeSchema = z.object({ baseline: z.string().trim().min(1).max(2000), target: z.string().trim().min(1).max(2000), result: z.string().trim().min(1).max(2000), unit: z.string().trim().min(1).max(100), measurementStart: z.string().trim().min(1).max(40), measurementEnd: z.string().trim().min(1).max(40), method: z.string().trim().min(1).max(2000), beneficiaries: z.string().trim().min(1).max(2000), evidence: z.array(z.string().url()).min(1).max(10), validationNote: z.string().trim().min(1).max(2000), expectedVersion: z.number().int().positive() }).strict();
const reopenSchema = z.object({ reason: z.string().trim().min(10).max(2000), expectedVersion: z.number().int().positive() }).strict();

router.get("/projects/:id/closures", async (req, res, next) => { try { const project = await Project.findOne({ id: String(req.params.id) }); if (!project) throw NotFoundError("Project not found"); sendSuccess(res, await ProjectClosure.find({ projectId: project.id }).sort({ createdAt: 1 }).lean()); } catch (error) { next(error); } });

// Closure is restricted to an administrator after deployment evidence and outcome validation.
router.post("/projects/:id/close", async (req, res, next) => {
  try {
    const input = closeSchema.parse(req.body); const projectId = String(req.params.id); const project = await Project.findOne({ id: projectId }); if (!project) throw NotFoundError("Project not found");
    if (project.closureStatus === "closed") throw ConflictError("This project is already closed"); if (project.version !== input.expectedVersion) throw ConflictError("This project changed. Refresh and retry."); if (project.currentStage !== "deployed") throw ValidationError("The project must reach deployed before closure"); if (!project.submissionId) throw ValidationError("This project is not connected to a citizen report");
    const deploymentEvidence = await MilestoneEvidence.findOne({ projectId, targetStage: "deployed", status: "approved" }).sort({ revision: -1 }); const deploymentReview = deploymentEvidence ? await MilestoneReview.findOne({ projectId, evidenceId: deploymentEvidence.evidenceId, targetStage: "deployed", status: "approved" }) : null; if (!deploymentEvidence || !deploymentReview) throw ValidationError("Approved deployment evidence is required before closure");
    const outcome = { baseline: input.baseline, target: input.target, result: input.result, unit: input.unit, measurementStart: input.measurementStart, measurementEnd: input.measurementEnd, method: input.method, beneficiaries: input.beneficiaries, evidence: input.evidence, validationNote: input.validationNote, validatedBy: req.auth!.userId, validatedAt: new Date() };
    const result = await withMongoTransaction(async (session) => {
      const updatedProject = await Project.findOneAndUpdate({ id: projectId, currentStage: "deployed", closureStatus: "open", version: input.expectedVersion }, { $set: { closureStatus: "closed", closedAt: new Date(), outcome }, $inc: { version: 1 } }, { new: true, session }); if (!updatedProject) throw ConflictError("This project changed or is already closed");
      const submission = await Submission.findOneAndUpdate({ _id: updatedProject.submissionId, status: { $in: ["assigned", "in_progress"] } }, { $set: { status: "resolved" } }, { new: true, session }); if (!submission) throw ConflictError("The citizen report is no longer open for closure");
      const [closure] = await ProjectClosure.create([{ closureId: randomUUID(), projectId, submissionId: submission._id.toString(), action: "closed", outcome, actorId: req.auth!.userId }], { session });
      await recordSubmissionActivity({ submissionId: submission._id, eventType: "project_closed", message: "The project outcome was validated and the report was resolved", actorId: req.auth!.userId, actorRole: "admin", metadata: { projectId, closureId: closure.closureId } }, session);
      await recordAuditEvent({ actorId: req.auth!.userId, actorRole: "admin", action: "project.closed", entityType: "project", entityId: projectId, metadata: { submissionId: submission._id.toString(), closureId: closure.closureId } }, session);
      return { project: updatedProject, submission, closure };
    });
    sendSuccess(res, { projectId, submissionId: result.submission._id.toString(), closureId: result.closure.closureId, status: result.project.closureStatus, version: result.project.version });
  } catch (error) { next(error); }
});

router.post("/projects/:id/reopen", async (req, res, next) => {
  try {
    const input = reopenSchema.parse(req.body); const projectId = String(req.params.id); const project = await Project.findOne({ id: projectId }); if (!project) throw NotFoundError("Project not found"); if (project.closureStatus !== "closed") throw ConflictError("This project is not closed"); if (project.version !== input.expectedVersion) throw ConflictError("This project changed. Refresh and retry."); if (!project.submissionId) throw ValidationError("This project is not connected to a citizen report");
    const result = await withMongoTransaction(async (session) => {
      const updatedProject = await Project.findOneAndUpdate({ id: projectId, closureStatus: "closed", version: input.expectedVersion }, { $set: { closureStatus: "open", reopenedAt: new Date(), currentStage: "piloted" }, $unset: { outcome: 1 }, $inc: { version: 1 } }, { new: true, session }); if (!updatedProject) throw ConflictError("This project changed or is already open");
      await recordProjectStage(updatedProject.id, "piloted", "reopen", session);
      const submission = await Submission.findOneAndUpdate({ _id: updatedProject.submissionId, status: "resolved" }, { $set: { status: "in_progress" } }, { new: true, session }); if (!submission) throw ConflictError("The citizen report is not resolved");
      const [closure] = await ProjectClosure.create([{ closureId: randomUUID(), projectId, submissionId: submission._id.toString(), action: "reopened", reason: input.reason, actorId: req.auth!.userId }], { session });
      await recordSubmissionActivity({ submissionId: submission._id, eventType: "project_reopened", message: "An administrator reopened the project for a corrective cycle", actorId: req.auth!.userId, actorRole: "admin", metadata: { projectId, closureId: closure.closureId, reason: input.reason } }, session);
      await recordAuditEvent({ actorId: req.auth!.userId, actorRole: "admin", action: "project.reopened", entityType: "project", entityId: projectId, metadata: { submissionId: submission._id.toString(), closureId: closure.closureId, reason: input.reason } }, session);
      return { project: updatedProject, submission, closure };
    });
    sendSuccess(res, { projectId, submissionId: result.submission._id.toString(), closureId: result.closure.closureId, status: result.project.closureStatus, currentStage: result.project.currentStage, version: result.project.version });
  } catch (error) { next(error); }
});

export default router;
