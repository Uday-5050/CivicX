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

const database = `civicx_test_milestones_${randomUUID().replaceAll("-", "")}`;
let adminToken: string;
let leadToken: string;
let studentToken: string;
let institutionId: string;
let leadId: string;
let studentId: string;
let citizenId: mongoose.Types.ObjectId;

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017", { dbName: database, serverSelectionTimeoutMS: 5000 });
  const institution = await Institution.create({ name: "Milestone University", type: "university", accountStatus: "active", profileStatus: "verified", acceptingWork: true });
  const admin = await User.create({ name: "Administrator", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "admin", accountStatus: "active" });
  const lead = await User.create({ name: "Project lead", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "university", accountStatus: "active", institutionId: institution._id });
  const student = await User.create({ name: "Project student", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "university", accountStatus: "active", institutionId: institution._id });
  const citizen = await User.create({ name: "Report author", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "citizen", accountStatus: "active" });
  await InstitutionMembership.create([{ institutionId: institution._id, userId: lead._id, role: "coordinator", status: "active" }, { institutionId: institution._id, userId: student._id, role: "student", status: "active" }]);
  adminToken = await signAccessToken(admin); leadToken = await signAccessToken(lead); studentToken = await signAccessToken(student); institutionId = institution._id.toString(); leadId = lead._id.toString(); studentId = student._id.toString(); citizenId = citizen._id;
});

afterAll(async () => { if (mongoose.connection.name === database) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
beforeEach(async () => { await Promise.all([MilestoneReview.deleteMany({}), MilestoneEvidence.deleteMany({}), ProjectMembership.deleteMany({}), Project.deleteMany({}), Submission.deleteMany({})]); });

async function createProject() {
  const submission = await Submission.create({ submitterId: citizenId, idempotencyKey: randomUUID(), title: "Flood sensor pilot", description: "A flood sensor pilot needs staged delivery and validation.", domain: "Environment", location: "Ward 4", submitterType: "citizen", attachments: [], status: "assigned", analysis: { status: "completed", category: "Environment", priority: "high", summary: "Flood monitoring" }, comments: [], upvotes: 0 });
  const project = await Project.create({ id: randomUUID(), challengeId: randomUUID(), submissionId: submission._id.toString(), institutionId, title: "Flood sensor pilot", summary: "A staged flood sensor pilot", domain: "Environment", department: "Water Lab", team: { leadId, mentorId: "", studentIds: [studentId] }, currentStage: "proposed", version: 1, evidence: {}, deliverables: [], ipDisclosures: [], testRecords: [] });
  await ProjectMembership.create([{ projectId: project.id, userId: leadId, institutionId, role: "lead", status: "active", department: "Water Lab", addedBy: leadId }, { projectId: project.id, userId: studentId, institutionId, role: "student", status: "active", department: "Water Lab", addedBy: leadId }]);
  return { project, submission };
}

describe("Task 11 milestone evidence and advancement", () => {
  it("requires reviewed next-stage evidence and consumes approvals once", async () => {
    const { project, submission } = await createProject();
    const evidence = await request(app).post(`/api/projects/${project.id}/milestones/funded/evidence`).auth(leadToken, { type: "bearer" }).send({ note: "Confirmed self-funded equipment and in-kind lab support for the first pilot stage.", links: [], expectedVersion: 1 });
    expect(evidence.status).toBe(201);
    expect(evidence.body.data.evidence.targetStage).toBe("funded");
    expect(evidence.body.data.board.currentStage).toBe("proposed");
    expect((await request(app).post(`/api/projects/${project.id}/milestones/prototyping/evidence`).auth(leadToken, { type: "bearer" }).send({ note: "This skips the funded stage and must fail.", links: [], expectedVersion: 2 })).status).toBe(409);

    const reviewed = await request(app).post(`/api/admin/projects/${project.id}/milestone-reviews`).auth(adminToken, { type: "bearer" }).send({ evidenceId: evidence.body.data.evidence.evidenceId, status: "approved", note: "Resource plan is confirmed and measurable.", expectedVersion: 2 });
    expect(reviewed.status).toBe(200);
    expect(reviewed.body.data.project.currentStage).toBe("proposed");
    const evidenceHistory = await request(app).get(`/api/projects/${project.id}/milestone-evidence`).auth(leadToken, { type: "bearer" });
    const reviewHistory = await request(app).get(`/api/projects/${project.id}/milestone-reviews`).auth(leadToken, { type: "bearer" });
    expect(evidenceHistory.body.data).toHaveLength(1);
    expect(evidenceHistory.body.data[0]).toMatchObject({ evidenceId: evidence.body.data.evidence.evidenceId, targetStage: "funded", status: "approved" });
    expect(reviewHistory.body.data[0]).toMatchObject({ reviewId: reviewed.body.data.review.reviewId, status: "approved" });
    const advanced = await request(app).post(`/api/projects/${project.id}/milestones/funded/advance`).auth(leadToken, { type: "bearer" }).send({ approvedReviewId: reviewed.body.data.review.reviewId, expectedVersion: 3 });
    expect(advanced.status).toBe(200);
    expect(advanced.body.data.board.currentStage).toBe("funded");
    expect((await Submission.findById(submission._id))?.status).toBe("assigned");
    expect((await request(app).post(`/api/projects/${project.id}/milestones/funded/advance`).auth(leadToken, { type: "bearer" }).send({ approvedReviewId: reviewed.body.data.review.reviewId, expectedVersion: 4 })).status).toBe(409);
  });

  it("keeps rejected evidence from advancing and allows project records with role limits", async () => {
    const { project } = await createProject();
    const evidence = await request(app).post(`/api/projects/${project.id}/milestones/funded/evidence`).auth(leadToken, { type: "bearer" }).send({ note: "Resource plan evidence for review and staged funding.", links: [], expectedVersion: 1 });
    const rejected = await request(app).post(`/api/admin/projects/${project.id}/milestone-reviews`).auth(adminToken, { type: "bearer" }).send({ evidenceId: evidence.body.data.evidence.evidenceId, status: "rejected", note: "The resource confirmation needs a clearer delivery commitment.", expectedVersion: 2 });
    expect(rejected.status).toBe(200);
    expect((await request(app).post(`/api/projects/${project.id}/milestones/funded/advance`).auth(leadToken, { type: "bearer" }).send({ approvedReviewId: rejected.body.data.review.reviewId, expectedVersion: 3 })).status).toBe(409);
    const record = await request(app).post(`/api/projects/${project.id}/deliverables`).auth(studentToken, { type: "bearer" }).send({ title: "Sensor test plan", detail: "The student team documented the first test protocol.", expectedVersion: 3 });
    expect(record.status).toBe(200);
    expect((await request(app).post(`/api/projects/${project.id}/ipDisclosures`).auth(studentToken, { type: "bearer" }).send({ title: "IP note", detail: "Student cannot submit restricted IP records.", expectedVersion: 4 })).status).toBe(403);
  });
});
