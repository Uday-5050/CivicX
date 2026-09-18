import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import request from "supertest";
import app from "../src/app";
import { User } from "../src/modules/auth/user.model";
import { signAccessToken } from "../src/modules/auth/auth.service";
import { Institution } from "../src/modules/auth/institution.model";
import { InstitutionMembership } from "../src/modules/institutions/membership.model";
import { Project } from "../src/modules/projects/project.model";
import { ProjectMembership } from "../src/modules/projects/project-membership.model";
import { Submission } from "../src/modules/submissions/submission.model";
import { MilestoneEvidence } from "../src/modules/projects/milestone-evidence.model";
import { MilestoneReview } from "../src/modules/projects/milestone-review.model";
import { ProjectClosure } from "../src/modules/projects/project-closure.model";

const database = `civicx_test_closure_${randomUUID().replaceAll("-", "")}`;
let adminToken: string;
let leadToken: string;
let citizenToken: string;
let institutionId: string;
let leadId: string;
let citizenId: mongoose.Types.ObjectId;

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017", { dbName: database, serverSelectionTimeoutMS: 5000 });
  const institution = await Institution.create({ name: "Closure University", type: "university", accountStatus: "active", profileStatus: "verified", acceptingWork: true });
  const admin = await User.create({ name: "Closure administrator", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "admin", accountStatus: "active" });
  const lead = await User.create({ name: "Closure lead", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "university", accountStatus: "active", institutionId: institution._id });
  const citizen = await User.create({ name: "Closure citizen", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "citizen", accountStatus: "active" });
  await InstitutionMembership.create({ institutionId: institution._id, userId: lead._id, role: "coordinator", status: "active" });
  adminToken = await signAccessToken(admin); leadToken = await signAccessToken(lead); citizenToken = await signAccessToken(citizen); institutionId = institution._id.toString(); leadId = lead._id.toString(); citizenId = citizen._id;
});

afterAll(async () => { if (mongoose.connection.name === database) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
beforeEach(async () => { await Promise.all([ProjectClosure.deleteMany({}), MilestoneReview.deleteMany({}), MilestoneEvidence.deleteMany({}), ProjectMembership.deleteMany({}), Project.deleteMany({}), Submission.deleteMany({})]); });

async function createDeployedProject() {
  const submission = await Submission.create({ submitterId: citizenId, idempotencyKey: randomUUID(), title: "Validated flood pilot", description: "A flood pilot has been deployed and requires outcome validation.", domain: "Environment", location: "Ward 4", submitterType: "citizen", attachments: [], status: "in_progress", analysis: { status: "completed", category: "Environment", priority: "high", summary: "Flood pilot" }, comments: [], upvotes: 0 });
  const project = await Project.create({ id: randomUUID(), challengeId: randomUUID(), submissionId: submission._id.toString(), institutionId, title: "Validated flood pilot", summary: "Deployed flood monitoring", domain: "Environment", department: "Water Lab", team: { leadId, mentorId: "", studentIds: [] }, currentStage: "deployed", version: 1, evidence: { deployed: { id: randomUUID(), note: "Deployment handoff and maintenance evidence", links: [], submittedBy: leadId, submittedAt: new Date(), review: { status: "approved", note: "Deployment evidence accepted", reviewedBy: leadId, reviewedAt: new Date() } } }, deliverables: [], ipDisclosures: [], testRecords: [] });
  await ProjectMembership.create({ projectId: project.id, userId: leadId, institutionId, role: "lead", status: "active", department: "Water Lab", addedBy: leadId });
  const evidence = await MilestoneEvidence.create({ evidenceId: randomUUID(), projectId: project.id, targetStage: "deployed", revision: 1, note: "Deployment handoff and maintenance evidence", links: [], submittedBy: leadId, status: "approved" });
  await MilestoneReview.create({ reviewId: randomUUID(), evidenceId: evidence.evidenceId, projectId: project.id, targetStage: "deployed", status: "approved", note: "Deployment evidence accepted", reviewedBy: leadId });
  return { project, submission };
}

describe("Task 12 closure and reopening", () => {
  it("rejects premature closure, closes atomically, and retains reopen history", async () => {
    const { project: premature } = await createDeployedProject(); await Project.updateOne({ id: premature.id }, { $set: { currentStage: "piloted", version: 1 } });
    const blocked = await request(app).post(`/api/admin/projects/${premature.id}/close`).auth(adminToken, { type: "bearer" }).send({ baseline: "10", target: "5", result: "6", unit: "ppm", measurementStart: "2026-09-01", measurementEnd: "2026-09-10", method: "Validated field readings", beneficiaries: "Ward residents", evidence: ["https://example.test/outcome.pdf"], validationNote: "Admin checked the field log.", expectedVersion: 1 });
    expect(blocked.status).toBe(400);

    const { project, submission } = await createDeployedProject();
    const closed = await request(app).post(`/api/admin/projects/${project.id}/close`).auth(adminToken, { type: "bearer" }).send({ baseline: "10", target: "5", result: "6", unit: "ppm", measurementStart: "2026-09-01", measurementEnd: "2026-09-10", method: "Validated field readings", beneficiaries: "Ward residents", evidence: ["https://example.test/outcome.pdf"], validationNote: "Admin checked the field log and local handoff.", expectedVersion: 1 });
    expect(closed.status).toBe(200); expect(closed.body.data.status).toBe("closed"); expect(await Submission.findById(submission._id).then((row) => row?.status)).toBe("resolved"); expect(await ProjectClosure.countDocuments({ projectId: project.id, action: "closed" })).toBe(1);
    const publicDetail = await request(app).get(`/api/submissions/${submission._id}`).auth(citizenToken, { type: "bearer" });
    expect(publicDetail.status).toBe(200); expect(publicDetail.body.data.outcome).toMatchObject({ baseline: "10", target: "5", result: "6", unit: "ppm", evidenceCount: 1 }); expect(publicDetail.body.data.outcome.evidence).toBeUndefined();
    expect((await request(app).post(`/api/projects/${project.id}/deliverables`).auth(leadToken, { type: "bearer" }).send({ title: "Late record", detail: "Closed projects are read-only.", expectedVersion: 2 })).status).toBe(409);
    expect((await request(app).post(`/api/admin/projects/${project.id}/close`).auth(adminToken, { type: "bearer" }).send({ baseline: "10", target: "5", result: "6", unit: "ppm", measurementStart: "2026-09-01", measurementEnd: "2026-09-10", method: "Validated field readings", beneficiaries: "Ward residents", evidence: ["https://example.test/outcome.pdf"], validationNote: "Repeat closure", expectedVersion: 2 })).status).toBe(409);
    const reopened = await request(app).post(`/api/admin/projects/${project.id}/reopen`).auth(adminToken, { type: "bearer" }).send({ reason: "A corrective maintenance cycle is required after the follow-up measurement.", expectedVersion: 2 });
    expect(reopened.status).toBe(200); expect(reopened.body.data.status).toBe("open"); expect(reopened.body.data.currentStage).toBe("piloted"); expect(await Submission.findById(submission._id).then((row) => row?.status)).toBe("in_progress"); expect(await ProjectClosure.countDocuments({ projectId: project.id })).toBe(2);
    expect((await request(app).get(`/api/admin/projects/${project.id}/closures`).auth(adminToken, { type: "bearer" })).body.data.map((row: { action: string }) => row.action)).toEqual(["closed", "reopened"]);
  });
});
