import { randomUUID } from "node:crypto";
import { Router } from "express";
import { Types } from "mongoose";
import { requireAuth, requireRole } from "../auth/auth.middleware";
import { validate } from "../../middleware/validate";
import { ConflictError, NotFoundError } from "../../utils/errors";
import { sendSuccess } from "../../utils/response";
import { Submission } from "./submission.model";
import { classifySubmissionSchema, commentSchema, createSubmissionSchema, informationReplySchema } from "./submission.schemas";
import { uploadAttachments } from "./upload.middleware";
import { cloudinary, cloudinaryConfigured } from "../../config/cloudinary";
import { createIdempotent } from "../../utils/atomic";
import { InformationRequest } from "./information-request.model";
import { SubmissionActivity } from "./submission-activity.model";
import { recordSubmissionActivity, serializePublicActivity } from "./submission-activity.service";
import { classifyDeterministic, enqueueClassificationJob, getClassificationAnalysis } from "../classification/classification.service";
import { Project } from "../projects/project.model";

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
  sendSuccess(res, { status: "completed", ...classifyDeterministic(req.body) });
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
    const result = await createIdempotent(
      () => Submission.findOne({ submitterId: req.auth!.userId, idempotencyKey: input.idempotencyKey }),
      () => Submission.create({
        ...input,
        submitterId: req.auth!.userId,
        submitterType: "citizen",
        attachments: input.attachments.map(({ id, name, type, size, previewUrl }: { id: string; name: string; type: string; size: number; previewUrl?: string }) => ({ id, name, type, size, previewUrl: previewUrl ?? "" })),
        status: "submitted",
        analysis: { status: "pending" },
        comments: [],
        upvotes: 0,
      }),
    );
    if (!result.reused) {
      await recordSubmissionActivity({ submissionId: result.record._id, eventType: "submitted", message: "Report submitted", actorId: req.auth!.userId, actorRole: req.auth!.role });
      try {
        await enqueueClassificationJob(result.record._id.toString());
      } catch (classificationError) {
        const message = classificationError instanceof Error ? classificationError.message : "Classification failed";
        await Submission.updateOne({ _id: result.record._id }, { $set: { "analysis.status": "failed", "analysis.error": message } });
      }
    }
    const responseRecord = await Submission.findById(result.record._id) ?? result.record;
    sendSuccess(res, serialize(responseRecord), result.reused ? 200 : 201);
  } catch (error) { next(error); }
});

router.get("/", async (req, res, next) => {
  try {
    const submissions = await Submission.find({ submitterId: req.auth!.userId }).sort({ createdAt: -1, _id: -1 });
    sendSuccess(res, submissions.map(serialize));
  } catch (error) { next(error); }
});

router.get("/:id/timeline", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(String(req.params.id))) throw NotFoundError("Submission not found");
    const submission = await Submission.findOne({ _id: req.params.id, submitterId: req.auth!.userId });
    if (!submission) throw NotFoundError("Submission not found");
    const events = await SubmissionActivity.find({ submissionId: submission._id, visibility: "public" }).sort({ createdAt: 1 });
    sendSuccess(res, events.map(serializePublicActivity));
  } catch (error) { next(error); }
});

router.get("/:id/analysis", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(String(req.params.id))) throw NotFoundError("Submission not found");
    const submission = await Submission.findOne({ _id: req.params.id, submitterId: req.auth!.userId });
    if (!submission) throw NotFoundError("Submission not found");
    const analysis = await getClassificationAnalysis(submission._id.toString());
    sendSuccess(res, { status: submission.analysis.status, category: submission.analysis.category, priority: submission.analysis.priority, summary: submission.analysis.summary, provider: submission.analysis.provider, revision: submission.analysis.revision, job: analysis.job ? { status: analysis.job.status, attempts: analysis.job.attempts } : undefined });
  } catch (error) { next(error); }
});

router.get("/:id/information-requests", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(String(req.params.id))) throw NotFoundError("Submission not found");
    const submission = await Submission.findOne({ _id: req.params.id, submitterId: req.auth!.userId });
    if (!submission) throw NotFoundError("Submission not found");
    sendSuccess(res, await InformationRequest.find({ submissionId: submission._id }).sort({ createdAt: -1 }).lean());
  } catch (error) { next(error); }
});

router.post("/:id/information-requests/:requestId/reply", async (req, res, next) => {
  try {
    const input = informationReplySchema.parse(req.body);
    if (!Types.ObjectId.isValid(String(req.params.id))) throw NotFoundError("Submission not found");
    const submission = await Submission.findOne({ _id: req.params.id, submitterId: req.auth!.userId });
    if (!submission) throw NotFoundError("Submission not found");
    const updated = await InformationRequest.findOneAndUpdate(
      { requestId: String(req.params.requestId), submissionId: submission._id, status: "open" },
      { $set: { answer: input.answer, status: "answered", answeredBy: req.auth!.userId, answeredAt: new Date() } },
      { new: true, runValidators: true },
    );
    if (!updated) throw ConflictError("This information request is already answered or unavailable");
    await recordSubmissionActivity({ submissionId: submission._id, eventType: "information_provided", message: "Requested information was provided", actorId: req.auth!.userId, actorRole: req.auth!.role, visibility: "public", metadata: { requestId: updated.requestId } });
    sendSuccess(res, updated);
  } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(String(req.params.id))) throw NotFoundError("Submission not found");
    const submission = await Submission.findOne({ _id: req.params.id, submitterId: req.auth!.userId });
    if (!submission) throw NotFoundError("Submission not found");
    const [events, requests, project] = await Promise.all([
      SubmissionActivity.find({ submissionId: submission._id, visibility: "public" }).sort({ createdAt: 1 }),
      InformationRequest.find({ submissionId: submission._id }).sort({ createdAt: -1 }).lean(),
      Project.findOne({ submissionId: submission._id.toString(), closureStatus: "closed" }).select("outcome").lean(),
    ]);
    const outcome = project?.outcome ? {
      baseline: project.outcome.baseline,
      target: project.outcome.target,
      result: project.outcome.result,
      unit: project.outcome.unit,
      measurementStart: project.outcome.measurementStart,
      measurementEnd: project.outcome.measurementEnd,
      method: project.outcome.method,
      beneficiaries: project.outcome.beneficiaries,
      validationNote: project.outcome.validationNote,
      validatedAt: project.outcome.validatedAt,
      evidenceCount: project.outcome.evidence.length,
    } : undefined;
    sendSuccess(res, { ...serialize(submission), timeline: events.map(serializePublicActivity), informationRequests: requests, outcome });
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
