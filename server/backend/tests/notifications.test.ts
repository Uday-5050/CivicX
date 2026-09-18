import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import request from "supertest";
import app from "../src/app";
import { User } from "../src/modules/auth/user.model";
import { signAccessToken } from "../src/modules/auth/auth.service";
import { Submission } from "../src/modules/submissions/submission.model";
import { SubmissionActivity } from "../src/modules/submissions/submission-activity.model";
import { recordSubmissionActivity } from "../src/modules/submissions/submission-activity.service";
import { Notification } from "../src/modules/notifications/notification.model";
import { NotificationOutbox } from "../src/modules/notifications/notification-outbox.model";
import { enqueueNotification } from "../src/modules/notifications/notification.service";

const database = `civicx_test_notifications_${randomUUID().replaceAll("-", "")}`;
let firstToken: string;
let secondToken: string;
let firstId: string;
let citizenId: mongoose.Types.ObjectId;

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017", { dbName: database, serverSelectionTimeoutMS: 5000 });
  const first = await User.create({ name: "Notification recipient", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "citizen", accountStatus: "active" });
  const second = await User.create({ name: "Other recipient", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "citizen", accountStatus: "active" });
  firstToken = await signAccessToken(first); secondToken = await signAccessToken(second); firstId = first._id.toString(); citizenId = first._id;
});

afterAll(async () => { if (mongoose.connection.name === database) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
beforeEach(async () => { await Promise.all([Notification.deleteMany({}), NotificationOutbox.deleteMany({}), SubmissionActivity.deleteMany({}), Submission.deleteMany({})]); });

describe("Task 13 notification inbox and public timeline", () => {
  it("deduplicates inbox/outbox records and enforces recipient ownership", async () => {
    const input = { dedupeKey: "submission:one:review", recipientUserId: firstId, eventType: "reviewed", title: "Report reviewed", body: "An administrator reviewed your report." };
    const first = await enqueueNotification(input); const second = await enqueueNotification(input);
    expect(second.reused).toBe(true); expect(await Notification.countDocuments({})).toBe(1); expect(await NotificationOutbox.countDocuments({})).toBe(1);
    const inbox = await request(app).get("/api/notifications").auth(firstToken, { type: "bearer" }); expect(inbox.status).toBe(200); expect(inbox.body.data[0]).toMatchObject({ id: first.notification.notificationId, type: "system", read: false });
    expect((await request(app).get("/api/notifications").auth(secondToken, { type: "bearer" })).body.data).toEqual([]);
    expect((await request(app).post(`/api/notifications/${first.notification.notificationId}/read`).auth(secondToken, { type: "bearer" })).status).toBe(409);
    const read = await request(app).post(`/api/notifications/${first.notification.notificationId}/read`).auth(firstToken, { type: "bearer" }); expect(read.status).toBe(200); expect(read.body.data.read).toBe(true);
    expect((await request(app).get("/api/notifications/unread-count").auth(firstToken, { type: "bearer" })).body.data.count).toBe(0);
  });

  it("creates a citizen inbox item for public workflow events while hiding private timeline events", async () => {
    const submission = await Submission.create({ submitterId: citizenId, idempotencyKey: randomUUID(), title: "Public timeline test", description: "A report used to verify public and private timeline visibility.", domain: "Environment", location: "Ward 2", submitterType: "citizen", attachments: [], status: "under_review", analysis: { status: "completed", category: "Environment", priority: "medium", summary: "Timeline" }, comments: [], upvotes: 0 });
    await recordSubmissionActivity({ submissionId: submission._id, eventType: "reviewed", message: "Your report is under review", actorId: new mongoose.Types.ObjectId(), actorRole: "admin", visibility: "public" });
    await recordSubmissionActivity({ submissionId: submission._id, eventType: "internal_note", message: "Private staff note", actorId: new mongoose.Types.ObjectId(), actorRole: "admin", visibility: "private" });
    expect(await Notification.countDocuments({ recipientUserId: citizenId })).toBe(1);
    const timeline = await request(app).get(`/api/public/submissions/${submission._id.toString()}/timeline`); expect(timeline.status).toBe(200); expect(timeline.body.data.timeline.map((event: { type: string }) => event.type)).toEqual(["reviewed"]);
  });
});
