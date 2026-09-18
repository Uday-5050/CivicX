import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import request from "supertest";
import app from "../src/app";
import { User } from "../src/modules/auth/user.model";
import { Institution } from "../src/modules/auth/institution.model";
import { InstitutionMembership } from "../src/modules/institutions/membership.model";
import { signAccessToken } from "../src/modules/auth/auth.service";
import { Submission } from "../src/modules/submissions/submission.model";
import { Project } from "../src/modules/projects/project.model";
import { ProjectMembership } from "../src/modules/projects/project-membership.model";
import { Notification } from "../src/modules/notifications/notification.model";

const database = `civicx_test_task16_${randomUUID().replaceAll("-", "")}`;
let adminToken: string;
let citizenToken: string;
let universityToken: string;
let industryToken: string;
let citizenId: mongoose.Types.ObjectId;
let universityId: string;
let departmentId: string;

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017", { dbName: database, serverSelectionTimeoutMS: 5000 });
  const university = await Institution.create({ name: "Synthetic Water University", type: "university", accountStatus: "active", profileStatus: "verified", acceptingWork: true, domains: ["Water"], expertise: ["water sensors"], facilities: ["water lab"], serviceAreas: ["Ward 4"], maxActiveProjects: 5, departments: [{ id: "water-lab", name: "Water Lab", domains: ["Water"], active: true }] });
  const industry = await Institution.create({ name: "Synthetic Sensor Works", type: "industry", accountStatus: "active", profileStatus: "verified" });
  const admin = await User.create({ name: "Synthetic admin", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "admin", accountStatus: "active" });
  const citizen = await User.create({ name: "Synthetic citizen", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "citizen", accountStatus: "active" });
  const universityUser = await User.create({ name: "Synthetic coordinator", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "university", accountStatus: "active", institutionId: university._id });
  const industryUser = await User.create({ name: "Synthetic partner", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "industry", accountStatus: "active", institutionId: industry._id });
  await InstitutionMembership.create([
    { institutionId: university._id, userId: universityUser._id, role: "coordinator", status: "active", department: "Water Lab" },
    { institutionId: industry._id, userId: industryUser._id, role: "partner", status: "active" },
  ]);
  adminToken = await signAccessToken(admin); citizenToken = await signAccessToken(citizen); universityToken = await signAccessToken(universityUser); industryToken = await signAccessToken(industryUser);
  citizenId = citizen._id; universityId = university._id.toString(); departmentId = "water-lab";
});

afterAll(async () => {
  if (mongoose.connection.name === database) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

async function status(response: request.Response, expected: number) {
  expect(response.status, response.text).toBe(expected);
  return response.body.data;
}

describe("Task 16 synthetic citizen-to-industry lifecycle", () => {
  it("completes the browser/API workflow and resolves the citizen report", async () => {
    const created = await status(await request(app).post("/api/submissions").auth(citizenToken, { type: "bearer" }).send({
      idempotencyKey: randomUUID(), title: "Water loss in Ward 4", description: "Residents lose water through a leaking public line and need a sensor-assisted repair plan.", domain: "Water", location: "Ward 4", attachments: [],
    }), 201);
    const submissionId = created.id as string;
    expect(created.analysis.status).toBe("pending");

    await status(await request(app).post(`/api/admin/submissions/${submissionId}/review`).auth(adminToken, { type: "bearer" }).send({ decision: "reviewed", category: "Water", priority: "high", note: "Validated for university investigation." }), 200);
    const assignment = await status(await request(app).post(`/api/admin/submissions/${submissionId}/route`).auth(adminToken, { type: "bearer" }).send({ institutionId: universityId, departmentId }), 201);
    const accepted = await status(await request(app).post(`/api/university/assignments/${assignment.id}/decision`).auth(universityToken, { type: "bearer" }).send({ decision: "accepted", expectedVersion: 1 }), 200);
    const projectId = accepted.project.id as string;
    expect(accepted.project.currentStage).toBe("proposed");
    expect((await Submission.findById(submissionId))?.status).toBe("assigned");
    expect(await ProjectMembership.countDocuments({ projectId, role: "lead", status: "active" })).toBe(1);

    const proposal = await status(await request(app).post(`/api/projects/${projectId}/proposals`).auth(universityToken, { type: "bearer" }).send({
      approach: "Install low-cost sensors and compare daily readings with the existing repair schedule.", timeline: "Eight weeks", beneficiaries: "Residents and the ward maintenance team", rootCause: "Leaks are discovered only after residents report visible pressure loss.", workPlan: "Survey the line, install sensors, validate readings, and publish a repair handoff.", risks: "Sensor damage and intermittent connectivity", resources: "Water laboratory, field technician, and ward access", budgetMinor: 120000, currency: "INR",
    }), 201);
    await status(await request(app).post(`/api/projects/${projectId}/proposals/${proposal.id}/review`).auth(adminToken, { type: "bearer" }).send({ status: "approved", note: "Proposal has a measurable baseline and deployment plan." }), 200);

    const opportunity = await status(await request(app).post("/api/university/opportunities").auth(universityToken, { type: "bearer" }).send({ projectId, title: "Water sensor deployment partner", summary: "Support is needed for prototyping and field deployment of the water monitoring kit.", needs: ["prototyping", "deployment"] }), 201);
    const offer = await status(await request(app).post(`/api/industry/opportunities/${opportunity.id}/offers`).auth(industryToken, { type: "bearer" }).send({ supportType: "prototyping", responsibilities: "Build the enclosure and support two supervised field tests.", message: "We provide prototype hardware and an engineer for the pilot.", inKindDescription: "Prototype hardware, test equipment, and an engineer for the pilot." }), 201);
    await status(await request(app).post(`/api/university/offers/${offer.id}/decision`).auth(universityToken, { type: "bearer" }).send({ status: "accepted", expectedVersion: (await Project.findOne({ id: projectId }))?.version }), 200);
    expect(await ProjectMembership.countDocuments({ projectId, role: "industry_partner", status: "active" })).toBe(1);

    let lastReviewId = "";
    for (const stage of ["funded", "prototyping", "piloted", "deployed"] as const) {
      const board = await status(await request(app).get(`/api/projects/${projectId}/board`).auth(universityToken, { type: "bearer" }), 200);
      const evidence = await status(await request(app).post(`/api/projects/${projectId}/milestones/${stage}/evidence`).auth(universityToken, { type: "bearer" }).send({ note: `Evidence for ${stage}: resource plan, test results, and accountable owners are recorded.`, links: [], expectedVersion: board.version }), 201);
      const review = await status(await request(app).post(`/api/admin/projects/${projectId}/milestone-reviews`).auth(adminToken, { type: "bearer" }).send({ evidenceId: evidence.evidence.evidenceId, status: "approved", note: `Approved ${stage} evidence.`, expectedVersion: evidence.board.version }), 200);
      lastReviewId = review.review.reviewId;
      await status(await request(app).post(`/api/projects/${projectId}/milestones/${stage}/advance`).auth(universityToken, { type: "bearer" }).send({ approvedReviewId: lastReviewId, expectedVersion: review.project.version }), 200);
    }
    expect((await Project.findOne({ id: projectId }))?.currentStage).toBe("deployed");

    const deployed = await status(await request(app).get(`/api/projects/${projectId}/board`).auth(adminToken, { type: "bearer" }), 200);
    await status(await request(app).post(`/api/admin/projects/${projectId}/close`).auth(adminToken, { type: "bearer" }).send({ baseline: "1000 litres lost per day", target: "700 litres lost per day", result: "680 litres lost per day", unit: "litres/day", measurementStart: "2026-01-01", measurementEnd: "2026-02-28", method: "Validated sensor readings and ward maintenance logs", beneficiaries: "Ward 4 households", evidence: ["https://example.test/evidence/water-report"], validationNote: "Admin validated the deployment handoff and measured result.", expectedVersion: deployed.version }), 200);
    expect((await Submission.findById(submissionId))?.status).toBe("resolved");
    expect((await request(app).get(`/api/submissions/${submissionId}`).auth(citizenToken, { type: "bearer" })).status).toBe(200);
    expect((await request(app).get(`/api/submissions/${submissionId}/timeline`).auth(citizenToken, { type: "bearer" })).body.data.some((event: { type: string }) => event.type === "project_closed")).toBe(true);
    expect(await Notification.countDocuments({ recipientUserId: citizenId, eventType: "project_closed" })).toBe(1);
    const analytics = await status(await request(app).get("/api/admin/analytics").auth(adminToken, { type: "bearer" }), 200);
    expect(analytics.projects.closed).toBeGreaterThanOrEqual(1);
  });
});
