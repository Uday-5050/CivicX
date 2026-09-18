import { randomUUID } from "node:crypto";
import type { ClientSession } from "mongoose";
import { createIdempotent } from "../../utils/atomic";
import { NotificationOutbox, type NotificationOutboxDocument } from "./notification-outbox.model";
import { Notification } from "./notification.model";

export interface NotificationInput {
  dedupeKey: string;
  recipientUserId: string;
  eventType: string;
  title?: string;
  body?: string;
  payload?: Record<string, unknown>;
  availableAt?: Date;
}

export async function enqueueNotification(input: NotificationInput, session?: ClientSession): Promise<{ notification: NotificationOutboxDocument; reused: boolean }> {
  const findExisting = () => NotificationOutbox.findOne({ dedupeKey: input.dedupeKey }).session(session ?? null).exec();
  const create = async () => {
    const [notification] = await NotificationOutbox.create([{
      notificationId: randomUUID(),
      dedupeKey: input.dedupeKey,
      recipientUserId: input.recipientUserId,
      eventType: input.eventType,
      payload: input.payload ?? {},
      availableAt: input.availableAt ?? new Date(),
    }], { session });
    return notification;
  };
  const result = await createIdempotent(findExisting, create);
  await createIdempotent(
    () => Notification.findOne({ dedupeKey: input.dedupeKey }).session(session ?? null).exec(),
    async () => {
      const [notification] = await Notification.create([{
        notificationId: result.record.notificationId,
        dedupeKey: input.dedupeKey,
        recipientUserId: input.recipientUserId,
        eventType: input.eventType,
        title: input.title ?? "CivicX update",
        body: input.body ?? "There is an update on a CivicX record you follow.",
        payload: input.payload ?? {},
      }], { session });
      return notification;
    },
  );
  return { notification: result.record, reused: result.reused };
}

export async function claimNextNotification(now = new Date()) {
  return NotificationOutbox.findOneAndUpdate(
    { status: "pending", availableAt: { $lte: now } },
    { $set: { status: "processing" }, $inc: { attempts: 1 } },
    { sort: { availableAt: 1, createdAt: 1 }, new: true },
  );
}
