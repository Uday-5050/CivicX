import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import request from "supertest";
import app from "../src/app";
import { User } from "../src/modules/auth/user.model";
import { signAccessToken } from "../src/modules/auth/auth.service";
import { Institution } from "../src/modules/auth/institution.model";
import { InstitutionMembership } from "../src/modules/institutions/membership.model";
import { Submission } from "../src/modules/submissions/submission.model";
import { RoutingAssignment } from "../src/modules/routing/routing-assignment.model";
import { Project } from "../src/modules/projects/project.model";
import { ProjectMembership } from "../src/modules/projects/project-membership.model";
import { ProposalRevision, ProposalReview } from "../src/modules/projects/proposal.model";

const database = `civicx_test_project_access_${randomUUID().replaceAll("-", "")}`;
let adminToken: string;
let coordinatorToken: string;
let mentorToken: string;
let studentToken: string;
let outsiderToken: string;
let citizenId: mongoose.Types.ObjectId;
let institutionId: string;
let coordinatorId: string;
let mentorId: string;
let studentId: string;
const departmentId = "civic-engineering";

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017", { dbName: database, serverSelectionTimeoutMS: 5000 });
  const institution = await Institution.create({ name: "Project University", type: "university", accountStatus: "active", profileStatus: "verified", acceptingWork: true, domains: ["Infrastructure"], expertise: ["road safety"], facilities: ["testing lab"], serviceAreas: ["Ranchi"], maxActiveProjects: 10, departments: [{ id: departmentId, name: "Civic Engineering", domains: ["Infrastructure"], active: true }] });
  const admin = await User.create({ name: "Admin", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "admin", accountStatus: "active" });
  const coordinator = await User.create({ name: "Coordinator", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "university", accountStatus: "active", institutionId: institution._id });
  const mentor = await User.create({ name: "Mentor", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "university", accountStatus: "active", institutionId: institution._id });
  const student = await User.create({ name: "Student", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "university", accountStatus: "active", institutionId: institution._id });
  const outsider = await User.create({ name: "Unassigned member", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "university", accountStatus: "active", institutionId: institution._id });
  const citizen = await User.create({ name: "Citizen", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "citizen", accountStatus: "active" });
  await InstitutionMembership.create([
    { institutionId: institution._id, userId: coordinator._id, role: "coordinator", status: "active" },
    { institutionId: institution._id, userId: mentor._id, role: "mentor", status: "active" },
    { institutionId: institution._id, userId: student._id, role: "student", status: "active" },
  ]);
  adminToken = await signAccessToken(admin); coordinatorToken = await signAccessToken(coordinator); mentorToken = await signAccessToken(mentor); studentToken = await signAccessToken(student); outsiderToken = await signAccessToken(outsider);
  institutionId = institution._id.toString(); coordinatorId = coordinator._id.toString(); mentorId = mentor._id.toString(); studentId = student._id.toString(); citizenId = citizen._id;
});

afterAll(async () => {
  if (mongoose.connection.name === database) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([ProposalReview.deleteMany({}), ProposalRevision.deleteMany({}), ProjectMembership.deleteMany({}), Project.deleteMany({}), RoutingAssignment.deleteMany({}), Submission.deleteMany({})]);
  await Institution.updateOne({ _id: institutionId }, { $set: { routingReservations: 0 } });
});

async function projectWorkflow() {
  const submission = await Submission.create({ submitterId: citizenId, idempotencyKey: randomUUID(), title: "Unsafe road crossing", description: "An unsafe road crossing needs better lighting and a safer route.", domain: "Infrastructure", location: "Ranchi Ward 12", submitterType: "citizen", attachments: [], status: "under_review", analysis: { status: "completed", category: "Infrastructure", priority: "high", summary: "Infrastructure concern" }, comments: [], upvotes: 0 });
  const routed = await request(app).post(`/api/admin/submissions/${submission.id}/route`).auth(adminToken, { type: "bearer" }).send({ institutionId, departmentId });
  const accepted = await request(app).post(`/api/university/assignments/${routed.body.data.id}/decision`).auth(coordinatorToken, { type: "bearer" }).send({ decision: "accepted", expectedVersion: 1 });
  expect(accepted.status).toBe(200);
  return accepted.body.data.project.id as string;
}

describe("Task 08 project access, teams, and proposals", () => {
  it("shows projects only to members and builds a verified team", async () => {
    const projectId = await projectWorkflow();
    expect((await request(app).get("/api/projects").auth(outsiderToken, { type: "bearer" })).body.data).toEqual([]);
    const first = await request(app).post(`/api/projects/${projectId}/members`).auth(coordinatorToken, { type: "bearer" }).send({ userId: mentorId, role: "mentor", expectedVersion: 1 });
    expect(first.status).toBe(201);
    const second = await request(app).post(`/api/projects/${projectId}/members`).auth(coordinatorToken, { type: "bearer" }).send({ userId: studentId, role: "student", expectedVersion: 2 });
    expect(second.status).toBe(201);
    expect((await request(app).get("/api/projects").auth(mentorToken, { type: "bearer" })).body.data[0].id).toBe(projectId);
    expect((await request(app).get(`/api/projects/${projectId}/members`).auth(outsiderToken, { type: "bearer" })).status).toBe(403);
    const members = await request(app).get(`/api/projects/${projectId}/members`).auth(coordinatorToken, { type: "bearer" });
    expect(members.status).toBe(200);
    expect(members.body.data.map((member: { userId: string }) => member.userId)).toEqual(expect.arrayContaining([coordinatorId, mentorId, studentId]));
    expect((await request(app).post(`/api/projects/${projectId}/members`).auth(coordinatorToken, { type: "bearer" }).send({ userId: mentorId, role: "mentor", expectedVersion: 3 })).status).toBe(409);
  });

  it("preserves proposal revisions and restricts review to administrators", async () => {
    const projectId = await projectWorkflow();
    const addMentor = await request(app).post(`/api/projects/${projectId}/members`).auth(coordinatorToken, { type: "bearer" }).send({ userId: mentorId, role: "mentor", expectedVersion: 1 });
    expect(addMentor.status).toBe(201);
    const first = await request(app).post(`/api/projects/${projectId}/proposals`).auth(coordinatorToken, { type: "bearer" }).send({ approach: "Install and test a safer crossing design with residents.", timeline: "8 weeks", beneficiaries: "Students and residents using the crossing", rootCause: "Poor lighting and missing crossing controls", workPlan: "Survey, prototype, test, and document the intervention", risks: "Weather and access delays", resources: "University lab, student team, and field equipment", budgetMinor: 250000, currency: "INR" });
    expect(first.status).toBe(201);
    const second = await request(app).post(`/api/projects/${projectId}/proposals`).auth(mentorToken, { type: "bearer" }).send({ approach: "Pilot a monitored lighting and signage improvement.", timeline: "12 weeks", beneficiaries: "School children, families, and local residents", rootCause: "The crossing is not visible at evening hours", workPlan: "Measure baseline, install prototype, run pilot, and report results", risks: "Procurement and monsoon delays", resources: "Mentor, student team, testing lab, and community partner" });
    expect(second.status).toBe(201);
    const history = await request(app).get(`/api/projects/${projectId}/proposals`).auth(coordinatorToken, { type: "bearer" });
    expect(history.status).toBe(200);
    expect(history.body.data.map((proposal: { revision: number }) => proposal.revision)).toEqual([2, 1]);
    expect((await request(app).post(`/api/projects/${projectId}/proposals`).auth(studentToken, { type: "bearer" }).send({ approach: "Student proposal that should be rejected by role checks.", timeline: "4 weeks", beneficiaries: "Residents in the area", rootCause: "Visibility problem", workPlan: "Test an improvement", risks: "Access", resources: "Lab" })).status).toBe(403);
    const reviewed = await request(app).post(`/api/projects/${projectId}/proposals/${second.body.data.id}/review`).auth(adminToken, { type: "bearer" }).send({ status: "approved", note: "The proposed pilot has a measurable baseline and delivery plan." });
    expect(reviewed.status).toBe(200);
    expect(reviewed.body.data.proposal.status).toBe("approved");
    expect(await ProposalReview.countDocuments({ projectId, proposalId: second.body.data.id })).toBe(1);
  });
});
