import { randomUUID } from "node:crypto";
import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware";
import { validate } from "../../middleware/validate";
import { NotFoundError } from "../../utils/errors";
import { sendSuccess } from "../../utils/response";
import { Submission } from "./submission.model";
import { classifySubmissionSchema, commentSchema, createSubmissionSchema } from "./submission.schemas";
import { uploadAttachments } from "./upload.middleware";
import { cloudinary, cloudinaryConfigured } from "../../config/cloudinary";

type UploadedAttachment = { id: string; name: string; type: string; size: number; previewUrl: string };

function uploadToCloudinary(file: Express.Multer.File): Promise<UploadedAttachment> {
  if (!cloudinaryConfigured) return Promise.reject(new Error("Cloudinary is not configured"));
  const resourceType = file.mimetype.startsWith("video/") ? "video" : file.mimetype.startsWith("image/") ? "image" : "raw";

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "civicx/reports", resource_type: resourceType, use_filename: true, unique_filename: true },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Cloudinary did not return an upload result"));
        resolve({ id: result.public_id, name: file.originalname, type: file.mimetype, size: file.size, previewUrl: result.secure_url });
      },
    );
    stream.end(file.buffer);
  });
}

const router = Router();
router.use(requireAuth, requireRole("citizen"));

function serialize(submission: InstanceType<typeof Submission>) {
  const { _id, submitterId: _submitterId, comments, ...data } = submission.toObject();
  return { ...data, id: _id.toString(), comments: comments.length, hasUpvoted: false };
}

router.post("/classify", validate(classifySubmissionSchema), (req, res) => {
  const text = `${req.body.title} ${req.body.description} ${req.body.domain}`.toLowerCase();
  const category = text.includes("road") || text.includes("light") ? "Infrastructure" : text.includes("waste") || text.includes("water") ? "Public services" : "Community development";
  const priority = text.includes("unsafe") || text.includes("urgent") ? "high" : text.includes("minor") ? "low" : "medium";
  sendSuccess(res, { status: "completed", category, priority, summary: `This appears to be a ${category.toLowerCase()} concern.` });
});

router.post("/", uploadAttachments, async (req, _res, next) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    const attachments = await Promise.all(files.map(uploadToCloudinary));
    req.body = { ...req.body, attachments };
    next();
  } catch (error) { next(error); }
}, validate(createSubmissionSchema), async (req, res, next) => {
  try {
    const input = req.body;
    const existing = await Submission.findOne({ submitterId: req.auth!.userId, idempotencyKey: input.idempotencyKey });
    if (existing) return sendSuccess(res, serialize(existing));
    const created = await Submission.create({
      ...input,
      submitterId: req.auth!.userId,
      submitterType: "citizen",
      attachments: input.attachments.map(({ id, name, type, size, previewUrl }: { id: string; name: string; type: string; size: number; previewUrl?: string }) => ({ id, name, type, size, previewUrl: previewUrl ?? "" })),
      status: "submitted",
      analysis: { status: "pending" },
      comments: [],
      upvotes: 0,
    });
    sendSuccess(res, serialize(created), 201);
  } catch (error) { next(error); }
});

router.get("/", async (req, res, next) => {
  try {
    const submissions = await Submission.find({ submitterId: req.auth!.userId }).sort({ createdAt: -1, _id: -1 });
    sendSuccess(res, submissions.map(serialize));
  } catch (error) { next(error); }
});

router.post("/:id/comments", validate(commentSchema), async (req, res, next) => {
  try {
    const submission = await Submission.findOne({ _id: req.params.id, submitterId: req.auth!.userId });
    if (!submission) throw NotFoundError("Submission not found");
    const comment = { id: randomUUID(), authorId: submission.submitterId, text: req.body.text, createdAt: new Date() };
    submission.comments.push(comment);
    await submission.save();
    sendSuccess(res, { id: comment.id, text: comment.text });
  } catch (error) { next(error); }
});

export default router;
