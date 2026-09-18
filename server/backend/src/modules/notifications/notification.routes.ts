import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { ConflictError, NotFoundError } from "../../utils/errors";
import { sendSuccess } from "../../utils/response";
import { Notification } from "./notification.model";

const router = Router();
router.use(requireAuth);

function serialize(notification: InstanceType<typeof Notification>) {
  const raw = notification.toObject();
  const type = typeof raw.payload?.submissionId === "string" || raw.eventType.startsWith("submission_") ? "submission" : typeof raw.payload?.projectId === "string" || raw.eventType.startsWith("project_") ? "project" : "system";
  return { id: raw.notificationId, type, eventType: raw.eventType, title: raw.title, body: raw.body, payload: raw.payload, read: Boolean(raw.readAt), readAt: raw.readAt, createdAt: raw.createdAt };
}

router.get("/", async (req, res, next) => { try {
  const rows = await Notification.find({ recipientUserId: req.auth!.userId }).sort({ createdAt: -1 }).limit(100); sendSuccess(res, rows.map(serialize));
} catch (error) { next(error); } });

router.get("/unread-count", async (req, res, next) => { try { sendSuccess(res, { count: await Notification.countDocuments({ recipientUserId: req.auth!.userId, readAt: { $exists: false } }) }); } catch (error) { next(error); } });

router.post("/read-all", async (req, res, next) => { try { const result = await Notification.updateMany({ recipientUserId: req.auth!.userId, readAt: { $exists: false } }, { $set: { readAt: new Date() } }); sendSuccess(res, { marked: result.modifiedCount }); } catch (error) { next(error); } });

router.post("/:id/read", async (req, res, next) => { try {
  const updated = await Notification.findOneAndUpdate({ notificationId: String(req.params.id), recipientUserId: req.auth!.userId, readAt: { $exists: false } }, { $set: { readAt: new Date() } }, { new: true });
  if (!updated) { if (await Notification.exists({ notificationId: String(req.params.id) })) throw ConflictError("This notification is already read or belongs to another user"); throw NotFoundError("Notification not found"); }
  sendSuccess(res, serialize(updated));
} catch (error) { next(error); } });

export default router;
