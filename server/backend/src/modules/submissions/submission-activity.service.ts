import { randomUUID } from "node:crypto";
import type { ClientSession, Types } from "mongoose";
import { SubmissionActivity, type SubmissionActivityVisibility } from "./submission-activity.model";
import { Submission } from "./submission.model";
import { enqueueNotification } from "../notifications/notification.service";

export async function recordSubmissionActivity(input: {
  submissionId: Types.ObjectId | string;
  eventType: string;
  message: string;
  visibility?: SubmissionActivityVisibility;
  actorId?: Types.ObjectId | string;
  actorRole?: string;
  metadata?: Record<string, unknown>;
}, session?: ClientSession) {
  const [event] = await SubmissionActivity.create([{
    eventId: randomUUID(),
    submissionId: input.submissionId,
    eventType: input.eventType,
    message: input.message,
    visibility: input.visibility ?? "public",
    actorId: input.actorId,
    actorRole: input.actorRole,
    metadata: input.metadata ?? {},
  }], { session });
  if (input.visibility !== "private" && input.actorRole !== "citizen") {
    try {
      const submission = await Submission.findById(input.submissionId).select("submitterId").session(session ?? null);
      if (submission) await enqueueNotification({ dedupeKey: `submission:${submission._id.toString()}:activity:${event.eventId}`, recipientUserId: submission.submitterId.toString(), eventType: input.eventType, title: "Your report was updated", body: input.message, payload: { submissionId: submission._id.toString(), eventId: event.eventId } }, session);
    } catch { /* notification persistence must not undo a saved timeline event */ }
  }
  return event;
}

export function serializePublicActivity(event: InstanceType<typeof SubmissionActivity>) {
  return { id: event.eventId, type: event.eventType, message: event.message, createdAt: event.createdAt };
}
