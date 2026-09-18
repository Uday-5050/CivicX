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
import { Opportunity } from "../src/modules/industry/opportunity.model";
import { SupportOffer } from "../src/modules/industry/support-offer.model";
import { ProposalRevision } from "../src/modules/projects/proposal.model";

const database = `civicx_test_industry_${randomUUID().replaceAll("-", "")}`;
let universityToken: string;
let industryToken: string;
let universityInstitutionId: string;
let coordinatorId: string;
let industryUserId: string;

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017", { dbName: database, serverSelectionTimeoutMS: 5000 });
  const university = await Institution.create({ name: "Collaboration University", type: "university", accountStatus: "active", profileStatus: "verified", acceptingWork: true, domains: ["Environment"], departments: [{ id: "environment", name: "Environment Lab", domains: ["Environment"], active: true }] });
  const industry = await Institution.create({ name: "Civic Industry Ltd", type: "industry", accountStatus: "active", profileStatus: "verified" });
  const coordinator = await User.create({ name: "University coordinator", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "university", accountStatus: "active", institutionId: university._id });
  const industryUser = await User.create({ name: "Industry partner", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "industry", accountStatus: "active", institutionId: industry._id });
  await InstitutionMembership.create({ institutionId: university._id, userId: coordinator._id, role: "coordinator", status: "active" });
  universityToken = await signAccessToken(coordinator); industryToken = await signAccessToken(industryUser);
  universityInstitutionId = university._id.toString(); coordinatorId = coordinator._id.toString(); industryUserId = industryUser._id.toString();
});

afterAll(async () => { if (mongoose.connection.name === database) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

beforeEach(async () => { await Promise.all([SupportOffer.deleteMany({}), Opportunity.deleteMany({}), ProposalRevision.deleteMany({}), ProjectMembership.deleteMany({}), Project.deleteMany({})]); });

async function createProject() {
  const project = await Project.create({ id: randomUUID(), challengeId: randomUUID(), institutionId: universityInstitutionId, title: "River quality monitor", summary: "A low-cost monitor for the local river", domain: "Environment", department: "Environment Lab", team: { leadId: coordinatorId, mentorId: "", studentIds: [] }, currentStage: "proposed", version: 1, evidence: {}, deliverables: [], ipDisclosures: [], testRecords: [] });
  await ProjectMembership.create({ projectId: project.id, userId: coordinatorId, institutionId: universityInstitutionId, role: "lead", status: "active", department: "Environment Lab", addedBy: coordinatorId });
  await ProposalRevision.create({ proposalId: randomUUID(), projectId: project.id, revision: 1, status: "approved", approach: "A tested approach for the local pilot.", timeline: "12 weeks", beneficiaries: "Residents and local operators", rootCause: "The current process has no reliable monitoring.", workPlan: "Research, prototype, test, and hand over the solution.", risks: "Adoption risk will be managed through weekly reviews.", resources: "University lab, mentor hours, and field access.", authorId: coordinatorId });
  return project;
}

describe("Task 09 industry opportunities and support offers", () => {
  it("blocks publication without an approved proposal and validates support detail", async () => {
    const project = await createProject();
    await ProposalRevision.deleteMany({ projectId: project.id });
    const blocked = await request(app).post("/api/university/opportunities").auth(universityToken, { type: "bearer" }).send({ projectId: project.id, title: "Blocked opportunity", summary: "This opportunity must wait for proposal approval.", needs: ["funding"] });
    expect(blocked.status).toBe(409);

    await ProposalRevision.create({ proposalId: randomUUID(), projectId: project.id, revision: 1, status: "approved", approach: "A tested approach for the local pilot.", timeline: "12 weeks", beneficiaries: "Residents and local operators", rootCause: "The current process has no reliable monitoring.", workPlan: "Research, prototype, test, and hand over the solution.", risks: "Adoption risk will be managed through weekly reviews.", resources: "University lab, mentor hours, and field access.", authorId: coordinatorId });
    const published = await request(app).post("/api/university/opportunities").auth(universityToken, { type: "bearer" }).send({ projectId: project.id, title: "Validated opportunity", summary: "This opportunity is published after the proposal is approved.", needs: ["funding"] });
    const invalidOffer = await request(app).post(`/api/industry/opportunities/${published.body.data.id}/offers`).auth(industryToken, { type: "bearer" }).send({ supportType: "funding", responsibilities: "Provide a clear cash or resource commitment for the pilot.", message: "We can support the first phase of work." });
    expect(invalidOffer.status).toBe(400);
  });

  it("publishes a redacted opportunity and accepts one support offer", async () => {
    const project = await createProject();
    const published = await request(app).post("/api/university/opportunities").auth(universityToken, { type: "bearer" }).send({ projectId: project.id, title: "Industry support for river monitoring", summary: "We need a partner to prototype sensors and support field deployment.", needs: ["prototyping", "funding"] });
    expect(published.status).toBe(201);
    expect(published.body.data.projectId).toBe(project.id);
    expect((await request(app).post("/api/university/opportunities").auth(universityToken, { type: "bearer" }).send({ projectId: project.id, title: "Duplicate", summary: "This should not create another opportunity for the same project.", needs: ["funding"] })).status).toBe(409);

    const discover = await request(app).get("/api/industry/opportunities").auth(industryToken, { type: "bearer" });
    expect(discover.status).toBe(200);
    expect(discover.body.data[0]).toMatchObject({ id: published.body.data.id, projectTitle: project.title, university: "Collaboration University" });
    const offered = await request(app).post(`/api/industry/opportunities/${published.body.data.id}/offers`).auth(industryToken, { type: "bearer" }).send({ supportType: "prototyping", responsibilities: "Build and test the sensor enclosure with the university team.", message: "Our engineering team can provide a prototype and field support.", inKindDescription: "Prototype enclosure, test equipment, and an engineer for field support." });
    expect(offered.status).toBe(201);
    expect((await request(app).post(`/api/industry/opportunities/${published.body.data.id}/offers`).auth(industryToken, { type: "bearer" }).send({ supportType: "funding", responsibilities: "Provide a second offer that must be rejected as a duplicate.", message: "Duplicate support offer for this opportunity.", inKindDescription: "A duplicate resource commitment." })).status).toBe(409);
    expect((await request(app).get("/api/university/offers").auth(universityToken, { type: "bearer" })).body.data[0].id).toBe(offered.body.data.id);
  });

  it("grants industry project access once on acceptance and rejects stale decisions", async () => {
    const project = await createProject();
    const published = await request(app).post("/api/university/opportunities").auth(universityToken, { type: "bearer" }).send({ projectId: project.id, title: "Deployment partner needed", summary: "A partner is needed to deploy the tested solution across the ward.", needs: ["deployment"] });
    const offered = await request(app).post(`/api/industry/opportunities/${published.body.data.id}/offers`).auth(industryToken, { type: "bearer" }).send({ supportType: "deployment", responsibilities: "Deploy the solution at three monitored sites and report uptime.", message: "We will provide deployment engineers and support for the pilot.", inKindDescription: "Deployment engineers, field equipment, and uptime reporting." });
    const accepted = await request(app).post(`/api/university/offers/${offered.body.data.id}/decision`).auth(universityToken, { type: "bearer" }).send({ status: "accepted", expectedVersion: 1 });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.accessGranted).toBe(true);
    expect(await SupportOffer.countDocuments({ id: offered.body.data.id, status: "accepted" })).toBe(1);
    expect(await ProjectMembership.countDocuments({ projectId: project.id, userId: industryUserId, role: "industry_partner", status: "active" })).toBe(1);
    expect((await request(app).get("/api/projects").auth(industryToken, { type: "bearer" })).body.data.map((row: { id: string }) => row.id)).toContain(project.id);
    expect((await request(app).get(`/api/projects/${project.id}/board`).auth(industryToken, { type: "bearer" })).status).toBe(200);
    expect((await request(app).post(`/api/university/offers/${offered.body.data.id}/decision`).auth(universityToken, { type: "bearer" }).send({ status: "accepted", expectedVersion: 1 })).status).toBe(409);
  });
});
