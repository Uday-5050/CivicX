import { Router } from "express";
import { Types } from "mongoose";
import { requireAuth, requireRole } from "../auth/auth.middleware";
import { Institution } from "../auth/institution.model";
import { User } from "../auth/user.model";
import { Submission } from "../submissions/submission.model";
import { UniversityChallenge } from "../university/university.model";
import { Project } from "../projects/project.model";
import { z } from "zod";
import { sendSuccess } from "../../utils/response";
import { ConflictError, NotFoundError, ValidationError } from "../../utils/errors";

const router = Router();
router.use(requireAuth, requireRole("admin"));

const id = (value: string, label: string): string => {
  if (!Types.ObjectId.isValid(value)) throw NotFoundError(`${label} not found`);
  return value;
};

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

router.post("/moderation/:id", async (req, res, next) => {
  try {
    const status = String(req.body?.status); if (status !== "resolved" && status !== "dismissed") throw ValidationError("Status must be resolved or dismissed");
    const submission = await Submission.findById(id(String(req.params.id), "Submission")); if (!submission) throw NotFoundError("Submission not found");
    if (status === "resolved" && submission.status === "submitted") { submission.status = "under_review"; await submission.save(); }
    sendSuccess(res, { id: submission._id.toString(), title: submission.title, reason: status === "resolved" ? "Reviewed; ready to route" : "Retained without routing", reporter: "Citizen report", status, createdAt: submission.createdAt });
  } catch (error) { next(error); }
});

router.get("/audit", async (_req, res, next) => { try { sendSuccess(res, []); } catch (error) { next(error); } });

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
    if (submission.status !== "submitted") throw ConflictError("This submission is already being processed");
    submission.status = "under_review"; await submission.save();
    sendSuccess(res, { id: submission._id.toString(), status: submission.status });
  } catch (error) { next(error); }
});

// Routes one reviewed citizen report to one approved university. The university
// decides whether to accept it and supplies its actual team/proposal afterwards.
router.post("/submissions/:id/route", async (req, res, next) => {
  try {
    const submissionId = id(String(req.params.id), "Submission");
    const institutionId = id(String(req.body?.institutionId ?? ""), "University");
    const department = String(req.body?.department ?? "").trim();
    const members = Array.isArray(req.body?.members) ? req.body.members : [];
    if (!department || !members.length) throw ValidationError("Department and at least one proposed team member are required");
    if (!members.every((member: unknown) => typeof member === "object" && member !== null && ["mentor", "student"].includes(String((member as { role?: unknown }).role)))) throw ValidationError("Each team member must be a mentor or student");
    const university = await Institution.findOne({ _id: institutionId, type: "university", accountStatus: "active" });
    if (!university) throw ValidationError("Target university must be active");
    const submission = await Submission.findById(submissionId);
    if (!submission) throw NotFoundError("Submission not found");
    if (submission.status === "resolved") throw ConflictError("A resolved submission cannot be routed");
    const existing = await UniversityChallenge.findOne({ sourceSubmissionId: submissionId });
    if (existing) throw ConflictError("This submission is already routed");
    const challenge = await UniversityChallenge.create({
      sourceSubmissionId: submissionId, institutionId, title: submission.title, summary: submission.description,
      domain: submission.domain, priority: submission.analysis.priority ?? "medium", department,
      organization: "CivicX", feasibilityNotes: ["Citizen report reviewed by an administrator", `Location: ${submission.location}`], members,
    });
    submission.status = "under_review";
    await submission.save();
    sendSuccess(res, { id: challenge._id.toString(), submissionId, institutionId, status: "routed" }, 201);
  } catch (error) { next(error); }
});

const closeSchema = z.object({ baseline: z.string().trim().min(1).max(2000), result: z.string().trim().min(1).max(2000), unit: z.string().trim().min(1).max(100), evidence: z.array(z.string().url()).min(1).max(10), expectedVersion: z.number().int().positive() }).strict();
// Closure is restricted to an administrator after deployment evidence is approved.
router.post("/projects/:id/close", async (req, res, next) => {
  try {
    const input = closeSchema.parse(req.body); const project = await Project.findOne({ id: String(req.params.id) });
    if (!project) throw NotFoundError("Project not found");
    if (project.version !== input.expectedVersion) throw ConflictError("This project changed. Refresh and retry.");
    const deployment = project.evidence.deployed;
    if (project.currentStage !== "deployed" || deployment?.review?.status !== "approved") throw ValidationError("Approved deployment evidence is required before closure");
    if (!project.submissionId) throw ValidationError("This project is not connected to a citizen report");
    const submission = await Submission.findById(project.submissionId); if (!submission) throw NotFoundError("Citizen report not found");
    project.outcome = { baseline: input.baseline, result: input.result, unit: input.unit, evidence: input.evidence, validatedBy: req.auth!.userId, validatedAt: new Date() }; project.version += 1;
    await Promise.all([project.save(), Submission.updateOne({ _id: submission._id }, { $set: { status: "resolved" } })]);
    sendSuccess(res, { projectId: project.id, submissionId: submission._id.toString(), status: "resolved", version: project.version });
  } catch (error) { next(error); }
});

export default router;
