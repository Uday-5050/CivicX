import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import request from "supertest";
import app from "../src/app";
import { User } from "../src/modules/auth/user.model";
import { signAccessToken } from "../src/modules/auth/auth.service";
import { Institution } from "../src/modules/auth/institution.model";
import { Submission } from "../src/modules/submissions/submission.model";
import { Project } from "../src/modules/projects/project.model";
import { ProjectStageHistory } from "../src/modules/projects/project-stage-history.model";
import { RoutingAssignment } from "../src/modules/routing/routing-assignment.model";
import { SupportOffer } from "../src/modules/industry/support-offer.model";

const database = `civicx_test_analytics_${randomUUID().replaceAll("-", "")}`;
let adminToken: string;
let citizenToken: string;
let citizenId: mongoose.Types.ObjectId;
let universityId: mongoose.Types.ObjectId;
let industryId: mongoose.Types.ObjectId;

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017", { dbName: database, serverSelectionTimeoutMS: 5000 });
  const admin = await User.create({ name: "Analytics administrator", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "admin", accountStatus: "active" });
  const citizen = await User.create({ name: "Analytics citizen", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "citizen", accountStatus: "active" });
  const university = await Institution.create({ name: "Analytics University", type: "university", accountStatus: "active", profileStatus: "verified", acceptingWork: true });
  const industry = await Institution.create({ name: "Analytics Industry", type: "industry", accountStatus: "active", profileStatus: "verified" });
  adminToken = await signAccessToken(admin); citizenToken = await signAccessToken(citizen); citizenId = citizen._id; universityId = university._id; industryId = industry._id;
});

afterAll(async () => { if (mongoose.connection.name === database) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
beforeEach(async () => { await Promise.all([SupportOffer.deleteMany({}), RoutingAssignment.deleteMany({}), ProjectStageHistory.deleteMany({}), Project.deleteMany({}), Submission.deleteMany({})]); });

async function seed() {
  const resolved = await Submission.create({ submitterId: citizenId, idempotencyKey: randomUUID(), title: "Resolved water report", description: "A water monitoring project was completed.", domain: "Water", location: "Ward 1", submitterType: "citizen", attachments: [], status: "resolved", analysis: { status: "completed" }, comments: [], upvotes: 0 });
  const active = await Submission.create({ submitterId: citizenId, idempotencyKey: randomUUID(), title: "Active environment report", description: "A pilot is still running.", domain: "Environment", location: "Ward 1", submitterType: "citizen", attachments: [], status: "in_progress", analysis: { status: "completed" }, comments: [], upvotes: 0 });
  const duplicate = await Submission.create({ submitterId: citizenId, idempotencyKey: randomUUID(), title: "Duplicate environment report", description: "A duplicate report.", domain: "Environment", location: "Ward 2", submitterType: "citizen", attachments: [], status: "under_review", disposition: "duplicate", duplicateOf: resolved._id, analysis: { status: "completed" }, comments: [], upvotes: 0 });
  const closedProject = await Project.create({ id: randomUUID(), challengeId: randomUUID(), submissionId: resolved._id.toString(), institutionId: universityId.toString(), title: resolved.title, summary: resolved.description, domain: resolved.domain, department: "Water Lab", team: { leadId: randomUUID(), mentorId: "", studentIds: [] }, currentStage: "deployed", closureStatus: "closed", version: 1, evidence: {}, deliverables: [], ipDisclosures: [], testRecords: [] });
  const activeProject = await Project.create({ id: randomUUID(), challengeId: randomUUID(), submissionId: active._id.toString(), institutionId: universityId.toString(), title: active.title, summary: active.description, domain: active.domain, department: "Environment Lab", team: { leadId: randomUUID(), mentorId: "", studentIds: [] }, currentStage: "prototyping", closureStatus: "open", version: 1, evidence: {}, deliverables: [], ipDisclosures: [], testRecords: [] });
  for (const [projectId, stages] of [[closedProject.id, ["proposed", "funded", "prototyping", "piloted", "deployed"]], [activeProject.id, ["proposed", "funded", "prototyping"]]] as const) for (const stage of stages) await ProjectStageHistory.create({ eventId: randomUUID(), projectId, stage, source: "migration" });
  await RoutingAssignment.create({ assignmentId: randomUUID(), submissionId: resolved._id, institutionId: universityId, departmentId: "water", departmentName: "Water Lab", status: "accepted", isActive: false, matchSnapshot: { score: 90, components: [], generatedAt: new Date() }, assignedBy: new mongoose.Types.ObjectId(), decidedBy: new mongoose.Types.ObjectId() });
  await RoutingAssignment.create({ assignmentId: randomUUID(), submissionId: active._id, institutionId: universityId, departmentId: "environment", departmentName: "Environment Lab", status: "accepted", isActive: false, matchSnapshot: { score: 90, components: [], generatedAt: new Date() }, assignedBy: new mongoose.Types.ObjectId(), decidedBy: new mongoose.Types.ObjectId() });
  await SupportOffer.create({ id: randomUUID(), opportunityId: randomUUID(), projectId: closedProject.id, industryInstitutionId: industryId.toString(), universityInstitutionId: universityId.toString(), organization: "Analytics Industry", supportType: "deployment", responsibilities: "Deployment equipment and field support", message: "We will provide the deployment support.", amountMinor: 250000, currency: "INR", status: "accepted", version: 1, createdBy: randomUUID() });
  await SupportOffer.create({ id: randomUUID(), opportunityId: randomUUID(), projectId: activeProject.id, industryInstitutionId: industryId.toString(), universityInstitutionId: universityId.toString(), organization: "Analytics Industry", supportType: "prototyping", responsibilities: "Prototype equipment and mentoring", message: "We will provide prototype support.", amountMinor: 50000, currency: "INR", status: "pending", version: 1, createdBy: randomUUID() });
  return { resolved, active, duplicate };
}

describe("Task 14 administration analytics and CSV", () => {
  it("reconciles filtered counts and history-based stage funnel", async () => {
    await seed();
    const response = await request(app).get("/api/admin/analytics?domain=Environment&district=Ward%201").auth(adminToken, { type: "bearer" });
    expect(response.status).toBe(200);
    expect(response.body.data.submissions.total).toBe(1);
    expect(response.body.data.projects.total).toBe(1);
    expect(response.body.data.projects.active).toBe(1);
    expect(response.body.data.stageFunnel.find((row: { stage: string }) => row.stage === "prototyping").projects).toBe(1);
    expect(response.body.data.stageFunnel.find((row: { stage: string }) => row.stage === "deployed").projects).toBe(0);
    expect(response.body.data.districts[0].engagedInstitutions).toBe(1);
  });

  it("keeps institution filters and CSV export aligned", async () => {
    await seed();
    const filtered = await request(app).get(`/api/admin/analytics?institutionId=${universityId.toString()}`).auth(adminToken, { type: "bearer" });
    expect(filtered.status).toBe(200); expect(filtered.body.data.submissions.total).toBe(2); expect(filtered.body.data.projects.total).toBe(2); expect(filtered.body.data.engagedInstitutions.count).toBe(2);
    const csv = await request(app).get(`/api/admin/analytics/export.csv?institutionId=${universityId.toString()}`).auth(adminToken, { type: "bearer" });
    expect(csv.status).toBe(200); expect(csv.headers["content-type"]).toContain("text/csv"); expect(csv.headers["content-disposition"]).toContain("civicx-analytics-"); expect(csv.text).toContain("stage_funnel,prototyping,2"); expect(csv.text).toContain("cash_confirmed_minor,INR,250000");
  });

  it("keeps analytics administrator-only", async () => {
    const response = await request(app).get("/api/admin/analytics").auth(citizenToken, { type: "bearer" });
    expect(response.status).toBe(403);
  });
});
