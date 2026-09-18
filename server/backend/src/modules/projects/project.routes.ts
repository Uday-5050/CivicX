import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../auth/auth.middleware";
import { User } from "../auth/user.model";
import { Project, projectStages, type ProjectDocument, type ProjectStage } from "./project.model";
import { Submission } from "../submissions/submission.model";
import { Collaboration } from "../industry/collaboration.model";
import { SupportOffer } from "../industry/support-offer.model";
import { InstitutionMembership } from "../institutions/membership.model";
import { ProjectMembership, type ProjectMembershipRole } from "./project-membership.model";
import { ProposalRevision, ProposalReview } from "./proposal.model";
import { MilestoneEvidence } from "./milestone-evidence.model";
import { MilestoneReview } from "./milestone-review.model";
import { withMongoTransaction } from "../../utils/transactions";
import { ConflictError, ForbiddenError, NotFoundError } from "../../utils/errors";
import { sendSuccess } from "../../utils/response";
import { recordProjectStage } from "./project-stage-history.service";

const router = Router(); router.use(requireAuth);
const evidenceSchema = z.object({ note: z.string().trim().min(10).max(5000), links: z.array(z.string().url()).max(10).default([]), expectedVersion: z.number().int().positive() }).strict();
const advanceSchema = z.object({ approvedReviewId: z.string().uuid(), expectedVersion: z.number().int().positive() }).strict();
const recordSchema = z.object({ title: z.string().trim().min(1).max(200), detail: z.string().trim().min(1).max(10000), expectedVersion: z.number().int().positive() }).strict();
const memberSchema = z.object({ userId: z.string().refine((value) => /^[a-f\d]{24}$/i.test(value), "Invalid user id"), role: z.enum(["lead", "mentor", "student"]), expectedVersion: z.number().int().positive() }).strict();
const proposalSchema = z.object({ approach: z.string().trim().min(20).max(10000), timeline: z.string().trim().min(1).max(2000), beneficiaries: z.string().trim().min(10).max(5000), rootCause: z.string().trim().min(10).max(5000), workPlan: z.string().trim().min(20).max(10000), risks: z.string().trim().min(10).max(5000), resources: z.string().trim().min(10).max(5000), budgetMinor: z.number().int().min(0).optional(), currency: z.string().trim().length(3).toUpperCase().optional() }).strict();
const proposalReviewSchema = z.object({ status: z.enum(["approved", "returned"]), note: z.string().trim().min(1).max(2000) }).strict();

function board(project: ProjectDocument) {
  const raw = (project as any).toObject ? (project as any).toObject() : project;
  const current = projectStages.indexOf(raw.currentStage);
  return { id: raw.id, title: raw.title, summary: raw.summary, version: raw.version, currentStage: raw.currentStage, closureStatus: raw.closureStatus,
    milestones: projectStages.map((stage, index) => ({ id: stage, title: stage[0].toUpperCase() + stage.slice(1), description: `Evidence and administrator review are required for ${stage}.`, status: index < current ? "completed" : index === current ? "current" : "upcoming", dueDate: "", owner: "University team", evidence: raw.evidence?.[stage] })),
    deliverables: raw.deliverables, ipDisclosures: raw.ipDisclosures, testRecords: raw.testRecords, outcome: raw.outcome, updatedAt: raw.updatedAt };
}
async function accessibleProject(projectId: string, userId: string, role: string): Promise<any> {
  const project = await Project.findOne({ id: projectId }); if (!project) throw NotFoundError("Project not found");
  if (role === "admin") return project;
  const user = await User.findById(userId); if (!user?.institutionId) throw ForbiddenError("An institution is required");
  if (await ProjectMembership.exists({ projectId, userId: user._id, status: "active" })) return project;
  if (role === "industry" && (await Collaboration.exists({ projectId, industryInstitutionId: user.institutionId.toString(), status: "accepted" }) || await SupportOffer.exists({ projectId, industryInstitutionId: user.institutionId.toString(), status: "accepted" }))) return project;
  throw ForbiddenError("You do not have access to this project");
}
function assertProjectOpen(project: ProjectDocument) { if (project.closureStatus === "closed") throw ConflictError("This project is closed and read-only"); }

function serializeMember(member: InstanceType<typeof ProjectMembership>, user?: InstanceType<typeof User>) {
  return { id: member._id.toString(), projectId: member.projectId, userId: member.userId.toString(), name: user?.name, email: user?.email, role: member.role, status: member.status, department: member.department, addedBy: member.addedBy.toString(), createdAt: member.createdAt, updatedAt: member.updatedAt };
}

router.get("/", async (req, res, next) => { try {
  let projects: ProjectDocument[] = [];
  if (req.auth!.role === "admin") projects = await Project.find().sort({ updatedAt: -1, id: 1 });
  else {
    const memberships = await ProjectMembership.find({ userId: req.auth!.userId, status: "active" }).select("projectId").lean();
    const projectIds = memberships.map((membership) => membership.projectId);
    if (req.auth!.role === "industry") {
      const institutionId = (await User.findById(req.auth!.userId))?.institutionId?.toString();
      const collaborations = await Collaboration.find({ industryInstitutionId: institutionId, status: "accepted" }).select("projectId").lean();
      const offers = await SupportOffer.find({ industryInstitutionId: institutionId, status: "accepted" }).select("projectId").lean();
      projectIds.push(...collaborations.map((collaboration) => collaboration.projectId), ...offers.map((offer) => offer.projectId));
    }
    projects = await Project.find({ id: { $in: [...new Set(projectIds)] } }).sort({ updatedAt: -1, id: 1 });
  }
  sendSuccess(res, projects.map((project) => ({ id: project.id, title: project.title, summary: project.summary, domain: project.domain, department: project.department, currentStage: project.currentStage, version: project.version, updatedAt: project.updatedAt })));
} catch (e) { next(e); } });

router.get("/:id/members", async (req, res, next) => { try {
  const project = await accessibleProject(String(req.params.id), req.auth!.userId, req.auth!.role);
  const members = await ProjectMembership.find({ projectId: project.id }).sort({ role: 1, createdAt: 1 });
  const users = await User.find({ _id: { $in: members.map((member) => member.userId) } });
  const byId = new Map(users.map((user) => [user._id.toString(), user]));
  sendSuccess(res, members.map((member) => serializeMember(member, byId.get(member.userId.toString()))));
} catch (e) { next(e); } });

router.post("/:id/members", requireRole("university"), async (req, res, next) => { try {
  const projectId = String(req.params.id); const input = memberSchema.parse(req.body); const project = await accessibleProject(projectId, req.auth!.userId, "university");
  assertProjectOpen(project);
  const actor = await ProjectMembership.findOne({ projectId, userId: req.auth!.userId, role: "lead", status: "active" });
  if (!actor) throw ForbiddenError("Only the project lead can manage team members");
  const target = await User.findById(input.userId); if (!target || target.accountStatus !== "active" || target.role !== "university" || target.institutionId?.toString() !== project.institutionId) throw ForbiddenError("The user is not an active member of this university");
  const roster = await InstitutionMembership.findOne({ institutionId: target.institutionId, userId: target._id, status: "active" });
  if (!roster || (input.role === "student" && roster.role !== "student") || (input.role === "mentor" && !["mentor", "coordinator"].includes(roster.role)) || (input.role === "lead" && !["mentor", "coordinator"].includes(roster.role))) throw ForbiddenError("The user is not verified for this project role");
  if (await ProjectMembership.exists({ projectId, userId: target._id, status: "active" })) throw ConflictError("This user is already a project member");
  if (input.role === "lead" && await ProjectMembership.exists({ projectId, role: "lead", status: "active", userId: { $ne: target._id } })) throw ConflictError("This project already has a lead");
  const result = await withMongoTransaction(async (session) => {
    const membership = await ProjectMembership.create([{ projectId, userId: target._id, institutionId: target.institutionId!, role: input.role as ProjectMembershipRole, status: "active", department: roster.department ?? project.department, addedBy: req.auth!.userId }], { session });
    const update: Record<string, unknown> = { $inc: { version: 1 } };
    if (input.role === "lead") update.$set = { "team.leadId": target._id.toString() };
    if (input.role === "mentor") update.$set = { "team.mentorId": target._id.toString() };
    if (input.role === "student") update.$push = { "team.studentIds": target._id.toString() };
    const updatedProject = await Project.findOneAndUpdate({ id: projectId, version: input.expectedVersion }, update, { new: true, runValidators: true, session });
    if (!updatedProject) throw ConflictError("The project changed. Refresh and retry.");
    return { membership: membership[0], project: updatedProject };
  });
  sendSuccess(res, { member: serializeMember(result.membership, target), projectVersion: result.project.version }, 201);
} catch (e) { if (typeof e === "object" && e !== null && "code" in e && (e as { code?: unknown }).code === 11000) next(ConflictError("This user is already a project member")); else next(e); } });

router.get("/:id/proposals", async (req, res, next) => { try {
  const project = await accessibleProject(String(req.params.id), req.auth!.userId, req.auth!.role);
  const proposals = await ProposalRevision.find({ projectId: project.id }).sort({ revision: -1 });
  const reviews = await ProposalReview.find({ projectId: project.id }).sort({ createdAt: -1 }).lean();
  sendSuccess(res, proposals.map((proposal) => ({ ...proposal.toObject(), id: proposal.proposalId, reviews: reviews.filter((review) => review.proposalId === proposal.proposalId) })));
} catch (e) { next(e); } });

router.post("/:id/proposals", requireRole("university"), async (req, res, next) => { try {
  const project = await accessibleProject(String(req.params.id), req.auth!.userId, "university"); assertProjectOpen(project); const input = proposalSchema.parse(req.body); const member = await ProjectMembership.findOne({ projectId: project.id, userId: req.auth!.userId, role: { $in: ["lead", "mentor"] }, status: "active" });
  if (!member) throw ForbiddenError("Only project leads and mentors can submit a proposal");
  const latest = await ProposalRevision.findOne({ projectId: project.id }).sort({ revision: -1 }).lean();
  const proposal = await ProposalRevision.create({ proposalId: randomUUID(), projectId: project.id, revision: (latest?.revision ?? 0) + 1, status: "submitted", ...input, authorId: req.auth!.userId });
  sendSuccess(res, { ...proposal.toObject(), id: proposal.proposalId }, 201);
} catch (e) { next(e); } });

router.post("/:id/proposals/:proposalId/review", requireRole("admin"), async (req, res, next) => { try {
  const project = await accessibleProject(String(req.params.id), req.auth!.userId, "admin"); const input = proposalReviewSchema.parse(req.body);
  const proposal = await ProposalRevision.findOne({ projectId: project.id, proposalId: String(req.params.proposalId), status: "submitted" }); if (!proposal) throw NotFoundError("Submitted proposal not found");
  const updated = await ProposalRevision.findOneAndUpdate({ _id: proposal._id, status: "submitted" }, { $set: { status: input.status } }, { new: true }); if (!updated) throw ConflictError("This proposal was already reviewed");
  const review = await ProposalReview.create({ reviewId: randomUUID(), proposalId: updated.proposalId, projectId: project.id, status: input.status, note: input.note, reviewedBy: req.auth!.userId });
  sendSuccess(res, { proposal: { ...updated.toObject(), id: updated.proposalId }, review });
} catch (e) { next(e); } });

router.get("/:id/board", async (req, res, next) => { try { const project = await accessibleProject(String(req.params.id), req.auth!.userId, req.auth!.role); sendSuccess(res, board(project)); } catch (e) { next(e); } });
router.get("/:id/milestone-evidence", async (req, res, next) => { try {
  const project = await accessibleProject(String(req.params.id), req.auth!.userId, req.auth!.role);
  const rows = await MilestoneEvidence.find({ projectId: project.id }).sort({ submittedAt: -1, revision: -1 }).lean();
  sendSuccess(res, rows.map(({ _id, ...row }) => row));
} catch (e) { next(e); } });
router.get("/:id/milestone-reviews", async (req, res, next) => { try {
  const project = await accessibleProject(String(req.params.id), req.auth!.userId, req.auth!.role);
  const rows = await MilestoneReview.find({ projectId: project.id }).sort({ reviewedAt: -1 }).lean();
  sendSuccess(res, rows.map(({ _id, ...row }) => row));
} catch (e) { next(e); } });
router.post("/:id/milestones/:stage/evidence", requireRole("university"), async (req, res, next) => { try {
  const requestedStage = String(req.params.stage) as ProjectStage; if (!projectStages.includes(requestedStage)) throw NotFoundError("Milestone not found"); const input = evidenceSchema.parse(req.body);
  const project = await accessibleProject(String(req.params.id), req.auth!.userId, "university"); assertProjectOpen(project); if (!await ProjectMembership.exists({ projectId: project.id, userId: req.auth!.userId, role: "lead", status: "active" })) throw ForbiddenError("Only the project lead can submit formal milestone evidence");
  const currentIndex = projectStages.indexOf(project.currentStage); const requestedIndex = projectStages.indexOf(requestedStage); const targetStage = requestedIndex === currentIndex ? projectStages[currentIndex + 1] : requestedStage;
  if (!targetStage || projectStages.indexOf(targetStage) !== currentIndex + 1) throw ConflictError("Evidence must be submitted for the next milestone only"); if (project.version !== input.expectedVersion) throw ConflictError("This project changed. Refresh and retry.");
  const result = await withMongoTransaction(async (session) => {
    const latest = await MilestoneEvidence.findOne({ projectId: project.id, targetStage }).sort({ revision: -1 }).session(session ?? null).lean(); const evidenceId = randomUUID(); const revision = (latest?.revision ?? 0) + 1; const now = new Date();
    const updatedProject = await Project.findOneAndUpdate({ id: project.id, currentStage: project.currentStage, version: input.expectedVersion }, { $inc: { version: 1 }, $set: { [`evidence.${targetStage}`]: { id: evidenceId, note: input.note, links: input.links, submittedBy: req.auth!.userId, submittedAt: now } } }, { new: true, runValidators: true, session }); if (!updatedProject) throw ConflictError("This project changed. Refresh and retry.");
    const [evidence] = await MilestoneEvidence.create([{ evidenceId, projectId: project.id, targetStage, revision, note: input.note, links: input.links, submittedBy: req.auth!.userId, status: "pending", submittedAt: now }], { session }); return { evidence, project: updatedProject };
  });
  sendSuccess(res, { evidence: result.evidence, board: board(result.project) }, 201);
} catch (e) { next(e); } });

router.post("/:id/milestones/:stage/advance", requireRole("university"), async (req, res, next) => { try {
  const stage = String(req.params.stage) as ProjectStage; if (!projectStages.includes(stage)) throw NotFoundError("Milestone not found"); const input = advanceSchema.parse(req.body); const project = await accessibleProject(String(req.params.id), req.auth!.userId, "university"); assertProjectOpen(project); if (!await ProjectMembership.exists({ projectId: project.id, userId: req.auth!.userId, role: "lead", status: "active" })) throw ForbiddenError("Only the project lead can advance the project");
  const currentIndex = projectStages.indexOf(project.currentStage); if (projectStages.indexOf(stage) !== currentIndex + 1 || project.version !== input.expectedVersion) throw ConflictError("This project is not ready for that transition. Refresh and retry.");
  const result = await withMongoTransaction(async (session) => {
    const review = await MilestoneReview.findOneAndUpdate({ reviewId: input.approvedReviewId, projectId: project.id, targetStage: stage, status: "approved", $or: [{ consumedAt: { $exists: false } }, { consumedAt: null }] }, { $set: { consumedAt: new Date() } }, { new: true, session }); if (!review) throw ConflictError("An unused approved review for this milestone is required");
    const updatedProject = await Project.findOneAndUpdate({ id: project.id, currentStage: project.currentStage, version: input.expectedVersion }, { $set: { currentStage: stage }, $inc: { version: 1 } }, { new: true, session }); if (!updatedProject) throw ConflictError("This project changed. Refresh and retry.");
    await recordProjectStage(updatedProject.id, stage, "advancement", session);
    if (stage === "prototyping" && updatedProject.submissionId) await Submission.updateOne({ _id: updatedProject.submissionId, status: "assigned" }, { $set: { status: "in_progress" } }, { session }); return { review, project: updatedProject };
  });
  sendSuccess(res, { review: result.review, board: board(result.project) });
} catch (e) { next(e); } });

router.post("/:id/:kind", async (req, res, next) => { try {
  const kind = String(req.params.kind); if (!( ["deliverables", "ipDisclosures", "testRecords"] as string[]).includes(kind)) throw NotFoundError("Record type not found"); const input = recordSchema.parse(req.body); const project = await accessibleProject(String(req.params.id), req.auth!.userId, req.auth!.role); assertProjectOpen(project); const member = await ProjectMembership.findOne({ projectId: project.id, userId: req.auth!.userId, status: "active" }); if (!member) throw ForbiddenError("An active project membership is required"); if (kind === "ipDisclosures" && !["lead", "mentor"].includes(member.role)) throw ForbiddenError("Only university leads and mentors can record IP disclosures"); if (project.version !== input.expectedVersion) throw ConflictError("This project changed. Refresh and retry.");
  (project as any)[kind].push({ id: randomUUID(), title: input.title, detail: input.detail, author: req.auth!.userId, createdAt: new Date() }); project.version += 1; await project.save(); sendSuccess(res, board(project));
} catch (e) { next(e); } });export default router;
