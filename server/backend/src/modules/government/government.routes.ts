import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAuth, requireRole } from "../auth/auth.middleware";
import { registerSchema } from "../auth/auth.schemas";
import { hashPassword, publicUser } from "../auth/auth.service";
import { User } from "../auth/user.model";
import { Institution } from "../auth/institution.model";
import { UniversityChallenge } from "../university/university.model";
import { validate } from "../../middleware/validate";
import { ConflictError, NotFoundError, ValidationError } from "../../utils/errors";
import { sendSuccess } from "../../utils/response";
import { csv, dashboard, projectStage } from "./government.service";

const router = Router();
router.use(requireAuth, requireRole("government", "admin"));

router.post("/accounts", requireRole("admin"), validate(registerSchema.strict()), async (req, res, next) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);
    if (await User.exists({ email })) throw ConflictError("An account with this email already exists");
    const user = await User.create({ name, email, passwordHash: await hashPassword(password), role: "government", accountStatus: "active" });
    sendSuccess(res, { user: publicUser(user) }, 201);
  } catch (error) { next(error); }
});

for (const key of ["kpis", "domains", "districts", "universities", "industry", "projects", "trends", "challenges", "activity"] as const) {
  router.get(`/${key}`, async (_req, res, next) => {
    try { sendSuccess(res, (await dashboard())[key]); } catch (error) { next(error); }
  });
}

router.get("/projects/:id", async (req, res, next) => {
  try {
    const challenge = await UniversityChallenge.findOne({ "project.id": String(req.params.id) });
    if (!challenge) throw NotFoundError("Project not found");
    sendSuccess(res, { id: challenge.project!.id, challengeId: challenge.id, title: challenge.title,
      summary: challenge.summary, proposal: challenge.proposal, stage: projectStage(challenge),
      version: challenge.version, district: challenge.district ?? "Unspecified", industryId: challenge.industryId,
      reviews: challenge.reviews });
  } catch (error) { next(error); }
});

const reviewSchema = z.object({
  version: z.number().int().min(1),
  stage: z.enum(["submitted", "under_review", "in_progress", "pilot", "deployed"]),
  feedback: z.string().trim().min(1).max(5000),
}).strict();
router.post("/projects/:id/reviews", validate(reviewSchema), async (req, res, next) => {
  try {
    const { version, stage, feedback } = reviewSchema.parse(req.body);
    const id = String(req.params.id);
    const review = { id: randomUUID(), reviewerId: req.auth!.userId, stage, feedback, createdAt: new Date() };
    const updated = await UniversityChallenge.findOneAndUpdate({ "project.id": id, version },
      { $set: { governmentStage: stage }, $push: { reviews: review }, $inc: { version: 1 } }, { new: true, runValidators: true });
    if (!updated) {
      if (!await UniversityChallenge.exists({ "project.id": id })) throw NotFoundError("Project not found");
      throw ConflictError("Project changed. Reload before submitting a review.");
    }
    sendSuccess(res, { id, stage: updated.governmentStage, version: updated.version, review }, 201);
  } catch (error) { next(error); }
});

const metadataSchema = z.object({ version: z.number().int().min(1), district: z.string().trim().min(1).max(120),
  industryId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional() }).strict();
router.patch("/projects/:id", validate(metadataSchema), async (req, res, next) => {
  try {
    const { version, district, industryId } = metadataSchema.parse(req.body);
    if (industryId && !await Institution.exists({ _id: industryId, type: "industry", accountStatus: "active" })) throw ValidationError("Industry partner must be active");
    const id = String(req.params.id);
    const updated = await UniversityChallenge.findOneAndUpdate({ "project.id": id, version },
      { $set: { district, ...(industryId ? { industryId } : {}) }, ...(industryId === null ? { $unset: { industryId: 1 } } : {}), $inc: { version: 1 } },
      { new: true, runValidators: true });
    if (!updated) {
      if (!await UniversityChallenge.exists({ "project.id": id })) throw NotFoundError("Project not found");
      throw ConflictError("Project changed. Reload before updating.");
    }
    sendSuccess(res, { id, district: updated.district, industryId: updated.industryId, version: updated.version });
  } catch (error) { next(error); }
});

const exportSchema = z.object({ reportType: z.enum(["summary", "detailed", "district"]) }).strict();
const metricsSchema = z.object({
  patents: z.number().int().nonnegative().optional(), startupsIncubated: z.number().int().nonnegative().optional(),
  fundingLakhs: z.number().nonnegative().optional(), mentorshipHours: z.number().nonnegative().optional(),
  sector: z.string().trim().min(1).max(120).optional(),
  industryType: z.enum(["large", "startup", "msme", "csr", "unclassified"]).optional(),
}).strict().refine(value => Object.keys(value).length > 0, "Provide at least one metric");
router.patch("/institutions/:id/metrics", validate(metricsSchema), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    if (!/^[a-f\d]{24}$/i.test(id)) throw NotFoundError("Institution not found");
    const values = metricsSchema.parse(req.body);
    const updated = await Institution.findOneAndUpdate({ _id: id, accountStatus: "active" },
      { $set: Object.fromEntries(Object.entries(values).map(([key, value]) => [`metrics.${key}`, value])) },
      { new: true, runValidators: true });
    if (!updated) throw NotFoundError("Institution not found");
    sendSuccess(res, { id, metrics: updated.metrics });
  } catch (error) { next(error); }
});
router.post("/reports/export", validate(exportSchema), async (req, res, next) => {
  try {
    const { reportType } = exportSchema.parse(req.body);
    const data = await dashboard();
    const rows = reportType === "summary" ? data.kpis : reportType === "district" ? data.districts : data.projects;
    sendSuccess(res, { filename: `civicx-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`,
      url: `data:text/csv;charset=utf-8;base64,${Buffer.from(csv(rows)).toString("base64")}` });
  } catch (error) { next(error); }
});
export default router;
