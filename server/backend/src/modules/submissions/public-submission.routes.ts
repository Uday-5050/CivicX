import { Router } from "express";
import { Types } from "mongoose";
import { NotFoundError } from "../../utils/errors";
import { sendSuccess } from "../../utils/response";
import { Submission } from "./submission.model";
import { SubmissionActivity } from "./submission-activity.model";
import { serializePublicActivity } from "./submission-activity.service";

const router = Router();

router.get("/submissions/:id/timeline", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    if (!Types.ObjectId.isValid(id)) throw NotFoundError("Public submission not found");
    const submission = await Submission.findOne({ _id: id, disposition: "active" });
    if (!submission) throw NotFoundError("Public submission not found");
    const events = await SubmissionActivity.find({ submissionId: submission._id, visibility: "public" }).sort({ createdAt: 1 });
    sendSuccess(res, {
      submission: { id: submission._id.toString(), title: submission.title, domain: submission.domain, location: submission.location, status: submission.status, createdAt: submission.createdAt },
      timeline: events.map(serializePublicActivity),
    });
  } catch (error) { next(error); }
});

export default router;
