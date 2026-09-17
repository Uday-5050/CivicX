import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../auth/auth.middleware";
import { User } from "../auth/user.model";
import { Project, projectStages, type ProjectDocument, type ProjectStage } from "./project.model";
import { Submission } from "../submissions/submission.model";
import { Collaboration } from "../industry/collaboration.model";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../../utils/errors";
import { sendSuccess } from "../../utils/response";

const router = Router(); router.use(requireAuth);
const evidenceSchema = z.object({ note: z.string().trim().min(10).max(5000), links: z.array(z.string().url()).max(10).default([]), expectedVersion: z.number().int().positive() }).strict();
const reviewSchema = z.object({ status: z.enum(["approved", "rejected"]), note: z.string().trim().min(1).max(2000), expectedVersion: z.number().int().positive() }).strict();
const recordSchema = z.object({ title: z.string().trim().min(1).max(200), detail: z.string().trim().min(1).max(10000), expectedVersion: z.number().int().positive() }).strict();

function board(project: ProjectDocument) {
  const raw = (project as any).toObject ? (project as any).toObject() : project;
  const current = projectStages.indexOf(raw.currentStage);
  return { id: raw.id, title: raw.title, summary: raw.summary, version: raw.version, currentStage: raw.currentStage,
    milestones: projectStages.map((stage, index) => ({ id: stage, title: stage[0].toUpperCase() + stage.slice(1), description: `Evidence and administrator review are required for ${stage}.`, status: index < current ? "completed" : index === current ? "current" : "upcoming", dueDate: "", owner: "University team", evidence: raw.evidence?.[stage] })),
    deliverables: raw.deliverables, ipDisclosures: raw.ipDisclosures, testRecords: raw.testRecords, updatedAt: raw.updatedAt };
}
async function accessibleProject(projectId: string, userId: string, role: string): Promise<any> {
  const project = await Project.findOne({ id: projectId }); if (!project) throw NotFoundError("Project not found");
  if (role === "admin") return project;
  const user = await User.findById(userId); if (!user?.institutionId) throw ForbiddenError("An institution is required");
  if (role === "university" && user.institutionId.toString() === project.institutionId) return project;
  if (role === "industry" && await Collaboration.exists({ projectId, industryInstitutionId: user.institutionId.toString(), status: "accepted" })) return project;
  throw ForbiddenError("You do not have access to this project");
}
router.get("/:id/board", async (req, res, next) => { try { const project = await accessibleProject(String(req.params.id), req.auth!.userId, req.auth!.role); sendSuccess(res, board(project)); } catch (e) { next(e); } });
router.post("/:id/milestones/:stage/evidence", requireRole("university"), async (req, res, next) => { try {
  const stage = String(req.params.stage) as ProjectStage; if (!projectStages.includes(stage)) throw NotFoundError("Milestone not found"); const input = evidenceSchema.parse(req.body);
  const project = await accessibleProject(String(req.params.id), req.auth!.userId, "university"); if (project.currentStage !== stage) throw ValidationError("Evidence can only be submitted for the current milestone"); if (project.version !== input.expectedVersion) throw ConflictError("This project changed. Refresh and retry.");
  project.evidence[stage] = { id: randomUUID(), note: input.note, links: input.links, submittedBy: req.auth!.userId, submittedAt: new Date() }; project.version += 1; await project.save(); sendSuccess(res, board(project));
} catch (e) { next(e); } });
router.post("/:id/milestones/:stage/review", requireRole("admin"), async (req, res, next) => { try {
  const stage = String(req.params.stage) as ProjectStage; if (!projectStages.includes(stage)) throw NotFoundError("Milestone not found"); const input = reviewSchema.parse(req.body); const project = await accessibleProject(String(req.params.id), req.auth!.userId, "admin"); const item = project.evidence[stage];
  if (!item) throw ValidationError("Submit evidence before reviewing this milestone"); if (project.currentStage !== stage || project.version !== input.expectedVersion) throw ConflictError("This project changed. Refresh and retry."); item.review = { status: input.status, note: input.note, reviewedBy: req.auth!.userId, reviewedAt: new Date() };
  if (input.status === "approved") { const nextStage = projectStages[projectStages.indexOf(stage) + 1]; if (nextStage) project.currentStage = nextStage; if (stage === "funded" && project.submissionId) await Submission.updateOne({ _id: project.submissionId, status: "assigned" }, { $set: { status: "in_progress" } }); }
  project.version += 1; await project.save(); sendSuccess(res, board(project));
} catch (e) { next(e); } });
router.post("/:id/:kind", requireRole("university"), async (req, res, next) => { try {
  const kind = String(req.params.kind); if (!(["deliverables", "ipDisclosures", "testRecords"] as string[]).includes(kind)) throw NotFoundError("Record type not found"); const input = recordSchema.parse(req.body); const project = await accessibleProject(String(req.params.id), req.auth!.userId, "university"); if (project.version !== input.expectedVersion) throw ConflictError("This project changed. Refresh and retry.");
  (project as any)[kind].push({ id: randomUUID(), title: input.title, detail: input.detail, author: req.auth!.userId, createdAt: new Date() }); project.version += 1; await project.save(); sendSuccess(res, board(project));
} catch (e) { next(e); } });
export default router;
