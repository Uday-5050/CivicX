import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import request from "supertest";
import app from "../src/app";
import { User } from "../src/modules/auth/user.model";
import { Institution } from "../src/modules/auth/institution.model";
import { signAccessToken } from "../src/modules/auth/auth.service";
import { UniversityChallenge } from "../src/modules/university/university.model";
import { Submission } from "../src/modules/submissions/submission.model";
import { csv } from "../src/modules/government/government.service";

const database = `civicx_test_government_${randomUUID().replaceAll("-", "")}`;
let gov: string, citizen: string, admin: string, institutionId: string, partnerId: string;
const projectId = randomUUID();
const endpoints = ["kpis", "domains", "districts", "universities", "industry", "projects", "trends", "challenges", "activity"];
beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017", { dbName: database, serverSelectionTimeoutMS: 5000 });
  for (const role of ["government", "citizen", "admin"] as const) {
    const user = await User.create({ name: "Test", email: `${role}@example.test`, passwordHash: "unused", role });
    const token = await signAccessToken(user);
    if (role === "government") gov = token;
    if (role === "citizen") citizen = token;
    if (role === "admin") admin = token;
  }
  institutionId = (await Institution.create({ name: "Test university", type: "university", accountStatus: "active" })).id;
  partnerId = (await Institution.create({ name: "Test industry", type: "industry", accountStatus: "active" })).id;
  await UniversityChallenge.create({ institutionId, title: "Water project", summary: "Clean water", domain: "Water",
    priority: "high", department: "Science", organization: "Council", decision: "accepted",
    proposal: { approach: "Pilot", timeline: "8 weeks", mentorId: "mentor", studentIds: ["student"] },
    project: { id: projectId, status: "active", createdAt: new Date() } });
  await Submission.create({ submitterId: new mongoose.Types.ObjectId(), idempotencyKey: randomUUID(), title: "Citizen report",
    description: "Water issue", domain: "Water", location: "Private address", status: "submitted" });
});
afterAll(async () => {
  if (mongoose.connection.name === database) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
const get = (path: string, token = gov) => request(app).get(`/api/government/${path}`).auth(token, { type: "bearer" });
describe("Government portal", () => {
  it("protects every dashboard endpoint", async () => {
    for (const path of endpoints) {
      expect((await request(app).get(`/api/government/${path}`)).status).toBe(401);
      expect((await get(path, citizen)).status).toBe(403);
      const response = await get(path);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    }
  });
  it("lists existing university projects and redacts citizen identity", async () => {
    expect((await get("projects")).body.data[0]).toMatchObject({ id: projectId, university: "Test university", stage: "in_progress", district: "Unspecified" });
    const challenges = await get("challenges");
    expect(challenges.body.data).toHaveLength(2);
    expect(JSON.stringify(challenges.body)).not.toContain("Private address");
    expect(JSON.stringify(challenges.body)).not.toContain("submitterId");
    expect((await get("projects/missing")).status).toBe(404);
  });
  it("provisions government accounts only for administrators and supports login and refresh", async () => {
    const body = { name: "Government Officer", email: "officer@example.test", password: "Test-password-42" };
    expect((await request(app).post("/api/government/accounts").auth(gov, { type: "bearer" }).send(body)).status).toBe(403);
    const created = await request(app).post("/api/government/accounts").auth(admin, { type: "bearer" }).send(body);
    expect(created.status).toBe(201);
    expect(created.body.data.user.role).toBe("government");
    expect(JSON.stringify(created.body)).not.toContain("passwordHash");
    const agent = request.agent(app);
    const login = await agent.post("/api/auth/web/login").send({ email: body.email, password: body.password });
    expect(login.status).toBe(200);
    expect((await get("projects", login.body.data.accessToken)).status).toBe(200);
    expect((await agent.post("/api/auth/web/refresh")).status).toBe(200);
    await User.updateOne({ email: body.email }, { accountStatus: "suspended" });
    expect((await get("projects", login.body.data.accessToken)).status).toBe(401);
  });
  it("validates reviews and atomically rejects stale concurrent updates", async () => {
    const path = `/api/government/projects/${projectId}/reviews`;
    expect((await request(app).post(path).auth(citizen, { type: "bearer" }).send({})).status).toBe(403);
    expect((await request(app).post(path).auth(gov, { type: "bearer" }).send({ version: 1, stage: "invalid", feedback: "" })).status).toBe(400);
    const responses = await Promise.all(["pilot", "under_review"].map(stage => request(app).post(path).auth(gov, { type: "bearer" }).send({ version: 1, stage, feedback: "Review evidence" })));
    expect(responses.map(r => r.status).sort()).toEqual([201, 409]);
    const detail = (await get(`projects/${projectId}`)).body.data;
    expect(detail.version).toBe(2);
    expect(detail.reviews).toHaveLength(1);
    expect(detail.reviews[0].feedback).toBe("Review evidence");
    expect((await request(app).post(path).auth(gov, { type: "bearer" }).send({ version: 2, stage: "deployed", feedback: "Verified deployment" })).status).toBe(201);
    expect((await get("universities")).body.data[0].solutionsDeployed).toBe(1);
    expect((await get("trends")).body.data.at(-1).resolved).toBe(1);
  });
  it("saves district, partners and institution metrics", async () => {
    const response = await request(app).patch(`/api/government/projects/${projectId}`).auth(gov, { type: "bearer" }).send({ version: 3, district: "Ranchi", industryId: partnerId });
    expect(response.status).toBe(200);
    expect((await get("districts")).body.data.find((d: { district: string }) => d.district === "Ranchi").industryPartners).toBe(1);
    expect((await request(app).patch(`/api/government/institutions/${partnerId}/metrics`).auth(gov, { type: "bearer" }).send({ fundingLakhs: 12, industryType: "msme" })).status).toBe(200);
    expect((await get("industry")).body.data[0]).toMatchObject({ fundingLakhs: 12, type: "msme", deployments: 1 });
    expect((await request(app).patch(`/api/government/institutions/${institutionId}/metrics`).auth(gov, { type: "bearer" }).send({ patents: -1 })).status).toBe(400);
  });
  it("exports real reports and escapes spreadsheet formulas", async () => {
    for (const reportType of ["summary", "detailed", "district"]) {
      const response = await request(app).post("/api/government/reports/export").auth(gov, { type: "bearer" }).send({ reportType });
      expect(response.status).toBe(200);
      const content = Buffer.from(response.body.data.url.split(",")[1], "base64").toString();
      expect(content).toContain(reportType === "summary" ? "Total challenges" : reportType === "detailed" ? "Water project" : "Ranchi");
    }
    expect(csv([{ title: '=HYPERLINK("bad")' }])).toContain("'=HYPERLINK");
  });
});
