import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import request from "supertest";
import app from "../src/app";
import { User } from "../src/modules/auth/user.model";
import { signAccessToken } from "../src/modules/auth/auth.service";
import { Submission } from "../src/modules/submissions/submission.model";
import { ModerationRecord } from "../src/modules/submissions/moderation-record.model";
import { SubmissionActivity } from "../src/modules/submissions/submission-activity.model";

const database = `civicx_test_moderation_${randomUUID().replaceAll("-", "")}`;
let adminToken: string;
let citizenToken: string;
let otherCitizenToken: string;
let citizenId: mongoose.Types.ObjectId;

async function createSubmission(title: string) {
  return Submission.create({ submitterId: citizenId, idempotencyKey: randomUUID(), title, description: "A detailed report that is long enough for moderation tests.", domain: "Infrastructure", location: "Ward 1", submitterType: "citizen", attachments: [], status: "submitted", analysis: { status: "pending" }, comments: [], upvotes: 0 });
}

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017", { dbName: database, serverSelectionTimeoutMS: 5000 });
  const admin = await User.create({ name: "Admin", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "admin", accountStatus: "active" });
  const citizen = await User.create({ name: "Citizen", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "citizen", accountStatus: "active" });
  const other = await User.create({ name: "Other Citizen", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "citizen", accountStatus: "active" });
  citizenId = citizen._id;
  adminToken = await signAccessToken(admin);
  citizenToken = await signAccessToken(citizen);
  otherCitizenToken = await signAccessToken(other);
});

afterAll(async () => {
  if (mongoose.connection.name === database) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("Task 04 durable moderation and public timeline", () => {
  it("persists information requests, exposes safe detail, and accepts a citizen reply", async () => {
    const submission = await createSubmission("Broken street lighting");
    const review = await request(app).post(`/api/admin/submissions/${submission.id}/review`).auth(adminToken, { type: "bearer" }).send({ decision: "information_requested", question: "Which light poles are affected?", note: "Need a precise location" });
    expect(review.status).toBe(200);
    expect(review.body.data.status).toBe("under_review");
    expect(review.body.data.informationRequestId).toBeTruthy();
    expect(await ModerationRecord.exists({ submissionId: submission._id, decision: "information_requested" })).toBeTruthy();
    expect(await SubmissionActivity.exists({ submissionId: submission._id, eventType: "information_requested" })).toBeTruthy();

    const detail = await request(app).get(`/api/submissions/${submission.id}`).auth(citizenToken, { type: "bearer" });
    expect(detail.status).toBe(200);
    expect(detail.body.data.informationRequests).toHaveLength(1);
    expect(detail.body.data.timeline.some((event: { type: string }) => event.type === "information_requested")).toBe(true);
    expect((await request(app).get(`/api/submissions/${submission.id}`).auth(otherCitizenToken, { type: "bearer" })).status).toBe(404);

    const requestId = review.body.data.informationRequestId as string;
    const reply = await request(app).post(`/api/submissions/${submission.id}/information-requests/${requestId}/reply`).auth(citizenToken, { type: "bearer" }).send({ answer: "Poles 14 and 15 near the bus stop." });
    expect(reply.status).toBe(200);
    expect(reply.body.data.status).toBe("answered");
    expect((await request(app).post(`/api/submissions/${submission.id}/information-requests/${requestId}/reply`).auth(citizenToken, { type: "bearer" }).send({ answer: "Retry" })).status).toBe(409);
  });

  it("preserves duplicate originals and hides non-active dispositions from the public timeline", async () => {
    const original = await createSubmission("Original report");
    const duplicate = await createSubmission("Repeated report");
    const review = await request(app).post(`/api/admin/submissions/${duplicate.id}/review`).auth(adminToken, { type: "bearer" }).send({ decision: "marked_duplicate", duplicateOf: original.id });
    expect(review.status).toBe(200);
    const saved = await Submission.findById(duplicate.id);
    expect(saved?.disposition).toBe("duplicate");
    expect(saved?.duplicateOf?.toString()).toBe(original.id);
    expect((await Submission.findById(original.id))?.disposition).toBe("active");
    expect((await request(app).get(`/api/public/submissions/${duplicate.id}/timeline`)).status).toBe(404);
    expect((await request(app).get(`/api/public/submissions/${original.id}/timeline`)).status).toBe(200);
  });

  it("keeps the existing moderation action durable and restricts admin detail", async () => {
    const submission = await createSubmission("Moderation queue report");
    const action = await request(app).post(`/api/admin/moderation/${submission.id}`).auth(adminToken, { type: "bearer" }).send({ status: "dismissed" });
    expect(action.status).toBe(200);
    expect((await Submission.findById(submission.id))?.disposition).toBe("rejected");
    expect(await ModerationRecord.exists({ submissionId: submission._id, decision: "rejected" })).toBeTruthy();
    expect((await request(app).get(`/api/admin/submissions/${submission.id}`).auth(citizenToken, { type: "bearer" })).status).toBe(403);
  });
});
