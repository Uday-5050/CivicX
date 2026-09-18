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

const database = `civicx_test_routing_${randomUUID().replaceAll("-", "")}`;
let adminToken: string;
let citizenId: mongoose.Types.ObjectId;
let universityId: string;
let departmentId: string;

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017", { dbName: database, serverSelectionTimeoutMS: 5000 });
  const admin = await User.create({ name: "Routing admin", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "admin", accountStatus: "active" });
  const citizen = await User.create({ name: "Reporter", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "citizen", accountStatus: "active" });
  const university = await Institution.create({
    name: "Infrastructure University", type: "university", accountStatus: "active", profileStatus: "verified", acceptingWork: true,
    domains: ["Infrastructure"], expertise: ["road safety", "lighting"], facilities: ["testing lab"], serviceAreas: ["Ranchi"], maxActiveProjects: 1,
    departments: [{ id: "civic-engineering", name: "Civic Engineering", domains: ["Infrastructure"], active: true }],
  });
  adminToken = await signAccessToken(admin);
  citizenId = citizen._id;
  universityId = university._id.toString();
  departmentId = "civic-engineering";
});

afterAll(async () => {
  if (mongoose.connection.name === database) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await RoutingAssignment.deleteMany({});
  await Institution.updateOne({ _id: universityId }, { $set: { routingReservations: 0 } });
});

function report(title = "Unsafe road lighting") {
  return Submission.create({ submitterId: citizenId, idempotencyKey: randomUUID(), title, description: "An unsafe road crossing needs better lighting and a safer route.", domain: "Infrastructure", location: "Ranchi Ward 12", submitterType: "citizen", attachments: [], status: "under_review", analysis: { status: "completed", category: "Infrastructure", priority: "high", summary: "Infrastructure concern" }, comments: [], upvotes: 0 });
}

describe("Task 06 university matching and routing", () => {
  it("returns explainable eligible recommendations and records routing history", async () => {
    const submission = await report();
    const recommendations = await request(app).get(`/api/admin/university-recommendations/${submission.id}`).auth(adminToken, { type: "bearer" });
    expect(recommendations.status).toBe(200);
    expect(recommendations.body.data.candidates[0].institutionId).toBe(universityId);
    expect(recommendations.body.data.candidates[0].score).toBeGreaterThan(0);
    expect(recommendations.body.data.candidates[0].components.some((item: { reasons: string[] }) => item.reasons.length > 0)).toBe(true);

    const routed = await request(app).post(`/api/admin/submissions/${submission.id}/route`).auth(adminToken, { type: "bearer" }).send({ institutionId: universityId, departmentId });
    expect(routed.status).toBe(201);
    expect(routed.body.data.status).toBe("pending");
    expect(await RoutingAssignment.countDocuments({ submissionId: submission._id, status: "pending" })).toBe(1);

    const detail = await request(app).get(`/api/admin/submissions/${submission.id}`).auth(adminToken, { type: "bearer" });
    expect(detail.status).toBe(200);
    expect(detail.body.data.routing).toHaveLength(1);
    expect(detail.body.data.routing[0].institutionId).toBe(universityId);
    expect((await request(app).post(`/api/admin/submissions/${submission.id}/route`).auth(adminToken, { type: "bearer" }).send({ institutionId: universityId, departmentId })).status).toBe(409);
  });

  it("prevents concurrent routes from exceeding university capacity", async () => {
    const first = await report("First capacity report");
    const second = await report("Second capacity report");
    const responses = await Promise.all([
      request(app).post(`/api/admin/submissions/${first.id}/route`).auth(adminToken, { type: "bearer" }).send({ institutionId: universityId, departmentId }),
      request(app).post(`/api/admin/submissions/${second.id}/route`).auth(adminToken, { type: "bearer" }).send({ institutionId: universityId, departmentId }),
    ]);
    expect(responses.filter((response) => response.status === 201)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 409)).toHaveLength(1);
    expect(await RoutingAssignment.countDocuments({ institutionId: universityId, isActive: true })).toBe(1);
  });

  it("keeps unverified, suspended, and full universities out of recommendations", async () => {
    const submission = await report("No available university");
    await Institution.create({ name: "Unverified University", type: "university", accountStatus: "active", profileStatus: "draft", acceptingWork: true, domains: ["Infrastructure"], maxActiveProjects: 3 });
    await Institution.create({ name: "Suspended University", type: "university", accountStatus: "suspended", profileStatus: "verified", acceptingWork: true, domains: ["Infrastructure"], maxActiveProjects: 3 });
    await Institution.updateOne({ _id: universityId }, { $set: { routingReservations: 1 } });
    const response = await request(app).get(`/api/admin/university-recommendations/${submission.id}`).auth(adminToken, { type: "bearer" });
    expect(response.status).toBe(200);
    expect(response.body.data.noMatch).toBe(true);
    expect(response.body.data.candidates).toEqual([]);
  });
});
