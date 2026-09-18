import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../auth/auth.middleware";
import { User } from "../auth/user.model";
import { Institution } from "../auth/institution.model";
import { Project } from "../projects/project.model";
import { ProjectMembership } from "../projects/project-membership.model";
import { InstitutionMembership } from "../institutions/membership.model";
import { Collaboration } from "./collaboration.model";
import { Opportunity, opportunityNeeds } from "./opportunity.model";
import { SupportOffer } from "./support-offer.model";
import { ProposalRevision } from "../projects/proposal.model";
import { withMongoTransaction } from "../../utils/transactions";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../../utils/errors";
import { sendSuccess } from "../../utils/response";

const router = Router();
const requestSchema = z.object({ projectId: z.string().uuid(), collaborationType: z.enum(["mentorship", "funding", "prototyping", "deployment", "technology_transfer"]), message: z.string().trim().min(10).max(5000) }).strict();
const decisionSchema = z.object({ status: z.enum(["accepted", "declined"]), version: z.number().int().positive() }).strict();
const opportunitySchema = z.object({ projectId: z.string().uuid(), title: z.string().trim().min(3).max(200), summary: z.string().trim().min(20).max(5000), needs: z.array(z.enum(opportunityNeeds)).min(1).max(5) }).strict();
const offerSchema = z.object({ supportType: z.enum(opportunityNeeds), responsibilities: z.string().trim().min(20).max(5000), message: z.string().trim().min(10).max(5000), amountMinor: z.number().int().min(0).optional(), currency: z.string().trim().length(3).toUpperCase().optional(), inKindDescription: z.string().trim().max(5000).optional() }).strict().superRefine((value, ctx) => {
  if (value.amountMinor !== undefined && !value.currency) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["currency"], message: "Currency is required for a cash amount" });
  if (value.amountMinor === undefined && !value.inKindDescription?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["inKindDescription"], message: "Describe the in-kind support when no cash amount is supplied" });
});
function parseOfferInput(body: unknown) {
  try { return offerSchema.parse(body); } catch (error) { if (error instanceof z.ZodError) throw ValidationError("Request validation failed", error.errors.map((issue) => ({ field: issue.path.join("."), message: issue.message }))); throw error; }
}
const offerDecisionSchema = z.object({ status: z.enum(["accepted", "declined"]), expectedVersion: z.number().int().positive() }).strict();
async function institutionFor(userId: string, type: "industry" | "university") { const user = await User.findById(userId); const institution = user?.institutionId ? await Institution.findOne({ _id: user.institutionId, type, accountStatus: "active" }) : null; if (!institution) throw ForbiddenError(`An active ${type} institution is required`); return institution; }
function serialize(row: any) { const raw = row.toObject ? row.toObject() : row; const { _id, industryInstitutionId: _industryInstitutionId, universityInstitutionId: _universityInstitutionId, ...data } = raw; return { ...data, id: raw.id }; }
async function serializeWithProject(row: any) { const data = serialize(row); const project = await Project.findOne({ id: data.projectId }).select({ title: 1 }); return { ...data, projectTitle: project?.title ?? "Project" }; }
async function serializeOpportunity(row: any) { const raw = row.toObject ? row.toObject() : row; const project = await Project.findOne({ id: raw.projectId }).select({ title: 1, domain: 1, department: 1 }); const university = await Institution.findById(raw.universityInstitutionId).select({ name: 1 }); return { id: raw.id, projectId: raw.projectId, title: raw.title, summary: raw.summary, needs: raw.needs, status: raw.status, university: university?.name ?? "University", projectTitle: project?.title ?? "Project", domain: project?.domain, department: project?.department, createdAt: raw.createdAt, updatedAt: raw.updatedAt }; }
async function serializeOffer(row: any) { const data = serialize(row); const project = await Project.findOne({ id: data.projectId }).select({ title: 1 }); const opportunity = await Opportunity.findOne({ id: data.opportunityId }).select({ title: 1 }); return { ...data, projectTitle: project?.title ?? "Project", opportunityTitle: opportunity?.title ?? "Opportunity" }; }

router.post("/university/opportunities", requireAuth, requireRole("university"), async (req, res, next) => { try {
  const input = opportunitySchema.parse(req.body); const institution = await institutionFor(req.auth!.userId, "university"); const project = await Project.findOne({ id: input.projectId, institutionId: institution._id.toString() }); if (!project) throw NotFoundError("Project not found");
  const member = await ProjectMembership.findOne({ projectId: project.id, userId: req.auth!.userId, role: { $in: ["lead", "mentor"] }, status: "active" }); if (!member) throw ForbiddenError("Only project leads and mentors can publish an opportunity");
  if (!await ProposalRevision.exists({ projectId: project.id, status: "approved" })) throw ConflictError("An approved proposal is required before publishing an opportunity");
  if (await Opportunity.exists({ projectId: project.id })) throw ConflictError("This project already has a published opportunity");
  try { const row = await Opportunity.create({ id: randomUUID(), projectId: project.id, universityInstitutionId: institution._id.toString(), title: input.title, summary: input.summary, needs: [...new Set(input.needs)], status: "published", publishedBy: req.auth!.userId }); sendSuccess(res, await serializeOpportunity(row), 201); } catch (error: any) { if (error?.code === 11000) throw ConflictError("This project already has a published opportunity"); throw error; }
} catch (e) { next(e); } });

router.get("/industry/opportunities", requireAuth, requireRole("industry", "university", "admin"), async (_req, res, next) => { try { const rows = await Opportunity.find({ status: "published" }).sort({ createdAt: -1 }); sendSuccess(res, await Promise.all(rows.map(serializeOpportunity))); } catch (e) { next(e); } });

router.get("/industry/offers", requireAuth, requireRole("industry"), async (req, res, next) => { try { const institution = await institutionFor(req.auth!.userId, "industry"); const rows = await SupportOffer.find({ industryInstitutionId: institution._id.toString() }).sort({ createdAt: -1 }); sendSuccess(res, await Promise.all(rows.map(serializeOffer))); } catch (e) { next(e); } });

router.post("/industry/opportunities/:opportunityId/offers", requireAuth, requireRole("industry"), async (req, res, next) => { try {
  const input = parseOfferInput(req.body); const institution = await institutionFor(req.auth!.userId, "industry"); const opportunity = await Opportunity.findOne({ id: String(req.params.opportunityId), status: "published" }); if (!opportunity) throw NotFoundError("Opportunity not found"); if (!opportunity.needs.includes(input.supportType)) throw ForbiddenError("This opportunity does not request that type of support");
  const project = await Project.findOne({ id: opportunity.projectId }); if (!project) throw NotFoundError("Project not found");
  if (await SupportOffer.exists({ opportunityId: opportunity.id, industryInstitutionId: institution._id.toString() })) throw ConflictError("Your institution already offered support for this opportunity");
  try { const row = await SupportOffer.create({ id: randomUUID(), opportunityId: opportunity.id, projectId: project.id, industryInstitutionId: institution._id.toString(), universityInstitutionId: opportunity.universityInstitutionId, organization: institution.name, ...input, status: "pending", version: 1, createdBy: req.auth!.userId }); sendSuccess(res, await serializeOffer(row), 201); } catch (error: any) { if (error?.code === 11000) throw ConflictError("Your institution already offered support for this opportunity"); throw error; }
} catch (e) { next(e); } });

router.get("/university/offers", requireAuth, requireRole("university"), async (req, res, next) => { try { const institution = await institutionFor(req.auth!.userId, "university"); const rows = await SupportOffer.find({ universityInstitutionId: institution._id.toString() }).sort({ createdAt: -1 }); sendSuccess(res, await Promise.all(rows.map(serializeOffer))); } catch (e) { next(e); } });

router.post("/university/offers/:offerId/decision", requireAuth, requireRole("university"), async (req, res, next) => { try {
  const input = offerDecisionSchema.parse(req.body); const institution = await institutionFor(req.auth!.userId, "university"); const offer = await SupportOffer.findOne({ id: String(req.params.offerId), universityInstitutionId: institution._id.toString() }); if (!offer) throw NotFoundError("Support offer not found");
  const project = await Project.findOne({ id: offer.projectId, institutionId: institution._id.toString() }); if (!project) throw NotFoundError("Project not found");
  const universityMember = await InstitutionMembership.findOne({ institutionId: institution._id, userId: req.auth!.userId, status: "active", role: { $in: ["coordinator", "mentor"] } }); if (!universityMember) throw ForbiddenError("Only a verified university coordinator or mentor can decide offers");
  const result = await withMongoTransaction(async (session) => {
    const updated = await SupportOffer.findOneAndUpdate({ id: offer.id, status: "pending", version: input.expectedVersion }, { $set: { status: input.status }, $inc: { version: 1 } }, { new: true, session });
    if (!updated) throw ConflictError("This support offer has changed. Refresh and retry.");
    let membership = null;
    if (input.status === "accepted") {
      const offerUser = await User.findById(updated.createdBy).session(session ?? null); if (!offerUser || offerUser.institutionId?.toString() !== updated.industryInstitutionId || offerUser.role !== "industry") throw ConflictError("The offer creator is no longer an active industry user");
      membership = await ProjectMembership.findOneAndUpdate({ projectId: updated.projectId, userId: offerUser._id }, { $setOnInsert: { projectId: updated.projectId, userId: offerUser._id, institutionId: offerUser.institutionId, role: "industry_partner", status: "active", department: "Industry partner", addedBy: req.auth!.userId } }, { upsert: true, new: true, session, setDefaultsOnInsert: true });
      await Project.findOneAndUpdate({ id: updated.projectId }, { $inc: { version: 1 } }, { session });
    }
    return { offer: updated, membership };
  });
  sendSuccess(res, { offer: await serializeOffer(result.offer), accessGranted: input.status === "accepted", memberId: result.membership?._id?.toString() });
} catch (e) { next(e); } });

router.get("/industry/projects", requireAuth, requireRole("industry"), async (_req, res, next) => { try { const projects = await Project.find({ currentStage: { $ne: "deployed" } }).sort({ updatedAt: -1 }); const institutions = await Institution.find({ _id: { $in: projects.map(p => p.institutionId) } }); const nameById = new Map(institutions.map(i => [i._id.toString(), i.name])); sendSuccess(res, projects.map(p => ({ id: p.id, title: p.title, summary: p.summary, domain: p.domain, university: nameById.get(p.institutionId) ?? "University", department: p.department, milestone: p.currentStage, status: p.currentStage === "proposed" ? "open" : p.currentStage === "piloted" ? "pilot_ready" : "in_progress", needs: ["mentorship", "funding", "prototyping", "deployment", "technology_transfer"] }))); } catch (e) { next(e); } });
router.get("/industry/collaboration-requests", requireAuth, requireRole("industry"), async (req, res, next) => { try { const institution = await institutionFor(req.auth!.userId, "industry"); sendSuccess(res, await Promise.all((await Collaboration.find({ industryInstitutionId: institution._id.toString() }).sort({ createdAt: -1 })).map(serializeWithProject))); } catch (e) { next(e); } });
router.post("/industry/collaboration-requests", requireAuth, requireRole("industry"), async (req, res, next) => { try { const input = requestSchema.parse(req.body); const institution = await institutionFor(req.auth!.userId, "industry"); const project = await Project.findOne({ id: input.projectId }); if (!project) throw NotFoundError("Project not found"); const organization = institution.name; try { const row = await Collaboration.create({ id: randomUUID(), projectId: project.id, industryInstitutionId: institution._id.toString(), universityInstitutionId: project.institutionId, organization, collaborationType: input.collaborationType, message: input.message }); sendSuccess(res, await serializeWithProject(row), 201); } catch (error: any) { if (error?.code === 11000) throw ConflictError("Your institution already has a request for this project"); throw error; } } catch (e) { next(e); } });
router.get("/university/collaboration-requests", requireAuth, requireRole("university"), async (req, res, next) => { try { const institution = await institutionFor(req.auth!.userId, "university"); sendSuccess(res, await Promise.all((await Collaboration.find({ universityInstitutionId: institution._id.toString() }).sort({ createdAt: -1 })).map(serializeWithProject))); } catch (e) { next(e); } });
router.post("/university/collaboration-requests/:id/decision", requireAuth, requireRole("university"), async (req, res, next) => { try { const input = decisionSchema.parse(req.body); const institution = await institutionFor(req.auth!.userId, "university"); const row = await Collaboration.findOne({ id: String(req.params.id), universityInstitutionId: institution._id.toString() }); if (!row) throw NotFoundError("Collaboration request not found"); if (row.status !== "pending" || row.version !== input.version) throw ConflictError("This request has changed. Refresh and retry."); row.status = input.status; row.version += 1; await row.save(); sendSuccess(res, await serializeWithProject(row)); } catch (e) { next(e); } });
export default router;
