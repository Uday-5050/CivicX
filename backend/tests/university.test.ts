import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import request from "supertest";
import app from "../src/app";
import { User } from "../src/modules/auth/user.model";
import { Institution } from "../src/modules/auth/institution.model";
import { signAccessToken } from "../src/modules/auth/auth.service";
import { UniversityChallenge } from "../src/modules/university/university.model";

// Dedicated disposable database; never touches the development database.
const database = `civicx_test_university_${randomUUID().replaceAll("-", "")}`;
let universityToken: string, otherToken: string, adminToken: string, citizenToken: string;
let institutionId: string;
const proposal = { approach: "Build and evaluate a pilot", timeline: "8 weeks", mentorId: "mentor", studentIds: ["student"] };
const challenge = () => ({ institutionId, title: "Route planning", summary: "Improve collection routes", domain: "Sustainability", priority: "high", department: "Computing", organization: "Council", feasibilityNotes: ["Pilot data available"], members: [{ id: "mentor", name: "Mentor", role: "mentor", department: "Computing", email: "mentor@example.test" }, { id: "student", name: "Student", role: "student", department: "Computing", email: "student@example.test" }] });
async function create() {
  const response = await request(app).post("/api/university/challenges").auth(adminToken, { type: "bearer" }).send(challenge());
  expect(response.status).toBe(201);
  return response.body.data.id as string;
}
function decide(id: string, data: unknown, token = universityToken) {
  return request(app).post(`/api/university/challenges/${id}/decision`).auth(token, { type: "bearer" }).send(data);
}
beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017", { dbName: database, serverSelectionTimeoutMS: 5000 });
  const institution = await Institution.create({ name: "Test university", type: "university", accountStatus: "active" });
  const other = await Institution.create({ name: "Other university", type: "university", accountStatus: "active" });
  institutionId = institution.id;
  async function token(role: "university" | "admin" | "citizen", institution?: string) {
    const user = await User.create({ name: "Test user", email: `${randomUUID()}@example.test`, passwordHash: "unused", role, accountStatus: "active", institutionId: institution });
    return signAccessToken(user);
  }
  universityToken = await token("university", institutionId);
  otherToken = await token("university", other.id);
  adminToken = await token("admin"); citizenToken = await token("citizen");
});
afterAll(async () => {
  if (mongoose.connection.name === database) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
describe("University workflow", () => {
  it("requires authentication and university role", async () => {
    expect((await request(app).get("/api/university/challenges")).status).toBe(401);
    expect((await request(app).get("/api/university/challenges").auth(citizenToken, { type: "bearer" })).status).toBe(403);
    expect((await request(app).post("/api/university/challenges").auth(universityToken, { type: "bearer" }).send(challenge())).status).toBe(403);
  });
  it("isolates institutions and persists accepted projects", async () => {
    const id = await create();
    const own = await request(app).get("/api/university/challenges").auth(universityToken, { type: "bearer" });
    expect(own.body.data.some((item: { id: string }) => item.id === id)).toBe(true);
    const other = await request(app).get("/api/university/challenges").auth(otherToken, { type: "bearer" });
    expect(other.body.data).toEqual([]);
    expect((await decide(id, { decision: "declined", version: 1 }, otherToken)).status).toBe(404);
    const accepted = await decide(id, { decision: "accepted", version: 1, proposal });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.version).toBe(2);
    expect(accepted.body.data.project.id).toBeTruthy();
    const saved = await UniversityChallenge.findById(id);
    expect(saved?.proposal?.approach).toBe(proposal.approach);
    expect(saved?.project?.id).toBe(accepted.body.data.project.id);
    expect((await decide(id, { decision: "declined", version: 2 })).status).toBe(409);
  });
  it("validates proposals and team membership without changing state", async () => {
    const id = await create();
    for (const data of [
      { decision: "accepted", version: 1 },
      { decision: "accepted", version: 1, proposal: { ...proposal, mentorId: "student" } },
      { decision: "accepted", version: 1, proposal: { ...proposal, studentIds: ["outsider"] } },
      { decision: "accepted", version: 1, proposal: { ...proposal, studentIds: ["student", "student"] } },
      { decision: "declined", version: 1, proposal },
    ]) expect((await decide(id, data)).status).toBe(400);
    expect((await UniversityChallenge.findById(id))?.version).toBe(1);
    expect((await decide(id, { decision: "declined", version: 9 })).status).toBe(409);
  });
  it("allows exactly one concurrent decision", async () => {
    const id = await create();
    const responses = await Promise.all([decide(id, { decision: "accepted", version: 1, proposal }), decide(id, { decision: "declined", version: 1 })]);
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
    expect((await UniversityChallenge.findById(id))?.version).toBe(2);
  });
  it("records information requests and declines without projects", async () => {
    for (const decision of ["info_requested", "declined"]) {
      const id = await create();
      const response = await decide(id, { decision, version: 1 });
      expect(response.status).toBe(200);
      expect(response.body.data.decision).toBe(decision);
      expect(response.body.data.project).toBeUndefined();
    }
  });
});
