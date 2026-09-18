import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../auth/auth.middleware";
import { sendSuccess } from "../../utils/response";
import { Types } from "mongoose";
import { analyticsCsv, buildAnalytics } from "./analytics.service";

const router = Router();
router.use(requireAuth, requireRole("admin"));
const filtersSchema = z.object({ domain: z.string().trim().min(1).max(120).optional(), district: z.string().trim().min(1).max(300).optional(), institutionId: z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid institution id").optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() }).strict().refine((value) => !value.from || !value.to || value.from < value.to, { message: "from must be earlier than to" });

function filters(query: unknown) { return filtersSchema.parse(query); }

router.get("/", async (req, res, next) => { try { sendSuccess(res, await buildAnalytics(filters(req.query))); } catch (error) { next(error); } });

router.get("/export.csv", async (req, res, next) => { try {
  const report = await buildAnalytics(filters(req.query));
  const filename = `civicx-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  res.status(200).set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"` }).send(analyticsCsv(report));
} catch (error) { next(error); } });

export default router;
