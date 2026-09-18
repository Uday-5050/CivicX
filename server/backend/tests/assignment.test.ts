import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import request from "supertest";
import app from "../src/app";
import { User } from "../src/modules/auth/user.model";
import { signAccessToken } from "../src/modules/auth/auth.service";
import { Institution } from "../src/modules/auth/institution.model";
import { Submission } from "../src/modules/submissions/submission.model";
import { RoutingAssignment } from "../src/modules/routing/routing-assignment.model";
import { Project } from "../src/modules/projects/project.model";

const database = `civicx_test_assignments_${randomUUID().replaceAll("-", "")}`;
let adminToken: string;
let universityToken: string;
let citizenId: mongoose.Types.ObjectId;
let institutionId: string;
const departmentId = "civic-engineering";

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017", { dbName: database, serverSelectionTimeoutMS: 5000 });
  const admin = await User.create({ name: "Admin", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "admin", accountStatus: "active" });
  const university = await Institution.create({ name: "Assignment University", type: "university", accountStatus: "active", profileStatus: "verified", acceptingWork: true, domains: ["Infrastructure"], expertise: ["road safety"], facilities: ["testing lab"], serviceAreas: ["Ranchi"], maxActiveProjects: 5, departments: [{ id: departmentId, name: "Civic Engineering", domains: ["Infrastructure"], active: true }] });
  const coordinator = await User.create({ name: "University coordinator", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "university", accountStatus: "active", institutionId: university._id });
  const citizen = await User.create({ name: "Citizen", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "citizen", accountStatus: "active" });
  adminToken = await signAccessToken(admin);
  universityToken = await signAccessToken(coordinator);
  citizenId = citizen._id;
  institutionId = university._id.toString();
});

afterAll(async () => {
  if (mongoose.connection.name === database) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([RoutingAssignment.deleteMany({}), Project.deleteMany({}), Submission.deleteMany({})]);
  await Institution.updateOne({ _id: institutionId }, { $set: { routingReservations: 0 } });
});

async function createRoutedAssignment() {
  const submission = await Submission.create({ submitterId: citizenId, idempotencyKey: randomUUID(), title: "Unsafe road crossing", description: "An unsafe road crossing needs better lighting and a safer route.", domain: "Infrastructure", location: "Ranchi Ward 12", submitterType: "citizen", attachments: [], status: "under_review", analysis: { status: "completed", category: "Infrastructure", priority: "high", summary: "Infrastructure concern" }, comments: [], upvotes: 0 });
  const routed = await request(app).post(`/api/admin/submissions/${submission.id}/route`).auth(adminToken, { type: "bearer" }).send({ institutionId, departmentId });
  expect(routed.status).toBe(201);
  return { submission, assignmentId: routed.body.data.id as string };
}

describe("Task 07 university assignment decisions", () => {
  it("lists assignments and accepts one atomically into a proposed project", async () => {
    const { submission, assignmentId } = await createRoutedAssignment();
    const inbox = await request(app).get("/api/university/assignments").auth(universityToken, { type: "bearer" });
    expect(inbox.status).toBe(200);
    expect(inbox.body.data[0].id).toBe(assignmentId);
    expect(inbox.body.data[0].report.title).toBe(submission.title);

    const accepted = await request(app).post(`/api/university/assignments/${assignmentId}/decision`).auth(universityToken, { type: "bearer" }).send({ decision: "accepted", expectedVersion: 1 });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.assignment.status).toBe("accepted");
    expect(accepted.body.data.project.currentStage).toBe("proposed");
    expect(accepted.body.data.project.id).toBeTruthy();
    expect((await Submission.findById(submission._id))?.status).toBe("assigned");
    expect(await Project.countDocuments({ challengeId: assignmentId })).toBe(1);
    expect((await Institution.findById(institutionId))?.routingReservations).toBe(0);

    const retry = await request(app).post(`/api/university/assignments/${assignmentId}/decision`).auth(universityToken, { type: "bearer" }).send({ decision: "accepted", expectedVersion: 1 });
    expect(retry.status).toBe(200);
    expect(retry.body.data.reused).toBe(true);
    expect(retry.body.data.project.id).toBe(accepted.body.data.project.id);
  });

  it("allows only one concurrent acceptance to create the project", async () => {
    const { assignmentId } = await createRoutedAssignment();
    const responses = await Promise.all([
      request(app).post(`/api/university/assignments/${assignmentId}/decision`).auth(universityToken, { type: "bearer" }).send({ decision: "accepted", expectedVersion: 1 }),
      request(app).post(`/api/university/assignments/${assignmentId}/decision`).auth(universityToken, { type: "bearer" }).send({ decision: "accepted", expectedVersion: 1 }),
    ]);
    expect(responses.filter((response) => response.status === 200)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 409)).toHaveLength(1);
    expect(await Project.countDocuments({ challengeId: assignmentId })).toBe(1);
  });

  it("keeps clarification pending and releases capacity on decline for rerouting", async () => {
    const first = await createRoutedAssignment();
    const clarification = await request(app).post(`/api/university/assignments/${first.assignmentId}/decision`).auth(universityToken, { type: "bearer" }).send({ decision: "info_requested", expectedVersion: 1, question: "Can the report include the affected ward boundary?" });
    expect(clarification.status).toBe(200);
    expect(clarification.body.data.assignment.status).toBe("pending");
    expect(clarification.body.data.assignment.version).toBe(2);
    expect(clarification.body.data.assignment.clarification.question).toContain("ward boundary");

    const declined = await request(app).post(`/api/university/assignments/${first.assignmentId}/decision`).auth(universityToken, { type: "bearer" }).send({ decision: "declined", expectedVersion: 2, reason: "This department cannot support the requested field work." });
    expect(declined.status).toBe(200);
    expect(declined.body.data.assignment.status).toBe("declined");
    expect((await Institution.findById(institutionId))?.routingReservations).toBe(0);
    const rerouted = await request(app).post(`/api/admin/submissions/${first.submission.id}/route`).auth(adminToken, { type: "bearer" }).send({ institutionId, departmentId, reason: "Rerouted after the first university declined." });
    expect(rerouted.status).toBe(201);
    expect(rerouted.body.data.id).not.toBe(first.assignmentId);
  });
});
