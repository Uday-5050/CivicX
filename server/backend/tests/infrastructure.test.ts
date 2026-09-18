import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { User } from "../src/modules/auth/user.model";
import { UniversityChallenge } from "../src/modules/university/university.model";
import { AuditEvent } from "../src/modules/audit/audit-event.model";
import { recordAuditEvent } from "../src/modules/audit/audit.service";
import { NotificationOutbox } from "../src/modules/notifications/notification-outbox.model";
import { enqueueNotification } from "../src/modules/notifications/notification.service";
import { updateWithExpectedVersion } from "../src/utils/atomic";
import { withMongoTransaction } from "../src/utils/transactions";

const database = `civicx_test_infrastructure_${randomUUID().replaceAll("-", "")}`;
let userId: string;

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017", { dbName: database, serverSelectionTimeoutMS: 5000 });
  userId = (await User.create({ name: "Infrastructure tester", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "admin", accountStatus: "active" })).id;
});

afterAll(async () => {
  if (mongoose.connection.name === database) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("Task 03 infrastructure helpers", () => {
  it("rejects stale expected versions with an atomic conflict", async () => {
    const challenge = await UniversityChallenge.create({ institutionId: new mongoose.Types.ObjectId().toString(), title: "Atomic update", summary: "Test", domain: "Testing", priority: "medium", department: "Engineering", organization: "CivicX", feasibilityNotes: [], members: [] });
    const updated = await updateWithExpectedVersion(UniversityChallenge, { _id: challenge._id }, 1, { $set: { decision: "declined" } });
    expect(updated.version).toBe(2);
    await expect(updateWithExpectedVersion(UniversityChallenge, { _id: challenge._id }, 1, { $set: { decision: "accepted" } })).rejects.toMatchObject({ statusCode: 409 });
  });

  it("persists audit events for later review", async () => {
    const event = await recordAuditEvent({ actorId: userId, actorRole: "admin", action: "test.created", entityType: "test", entityId: randomUUID(), metadata: { source: "test" } });
    expect(event.eventId).toBeTruthy();
    expect(await AuditEvent.exists({ eventId: event.eventId })).toBeTruthy();
  });

  it("returns the same outbox item for duplicate notification retries", async () => {
    const dedupeKey = `test:${randomUUID()}`;
    const first = await enqueueNotification({ dedupeKey, recipientUserId: userId, eventType: "test.event", payload: { ok: true } });
    const second = await enqueueNotification({ dedupeKey, recipientUserId: userId, eventType: "test.event", payload: { ok: false } });
    expect(second.reused).toBe(true);
    expect(second.notification.notificationId).toBe(first.notification.notificationId);
    expect(await NotificationOutbox.countDocuments({ dedupeKey })).toBe(1);
  });

  it("rolls back transaction work when MongoDB supports transactions", async () => {
    const hello = await mongoose.connection.db!.admin().command({ hello: 1 });
    if (!hello.setName) return;
    const email = `${randomUUID()}@example.test`;
    await expect(withMongoTransaction(async (session) => {
      await User.create([{ name: "Rollback", email, passwordHash: "unused", role: "admin", accountStatus: "active" }], { session });
      throw new Error("force rollback");
    })).rejects.toThrow("force rollback");
    expect(await User.exists({ email })).toBeNull();
  });
});
