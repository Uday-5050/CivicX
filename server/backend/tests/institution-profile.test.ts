import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import request from "supertest";
import app from "../src/app";
import { Institution } from "../src/modules/auth/institution.model";
import { User } from "../src/modules/auth/user.model";
import { signAccessToken } from "../src/modules/auth/auth.service";
import { InstitutionMembership } from "../src/modules/institutions/membership.model";

const database = `civicx_test_institutions_${randomUUID().replaceAll("-", "")}`;
let adminToken: string;
let universityToken: string;
let institutionId: string;
let otherInstitutionId: string;
let universityUserId: string;
let memberUserId: string;

async function token(user: InstanceType<typeof User>) { return signAccessToken(user); }

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017", { dbName: database, serverSelectionTimeoutMS: 5000 });
  const institution = await Institution.create({ name: "Civic University", type: "university", accountStatus: "active" });
  const other = await Institution.create({ name: "Other University", type: "university", accountStatus: "active" });
  institutionId = institution.id;
  otherInstitutionId = other.id;
  const admin = await User.create({ name: "Admin", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "admin", accountStatus: "active" });
  const university = await User.create({ name: "Coordinator", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "university", accountStatus: "active", institutionId: institution._id });
  const member = await User.create({ name: "Verified Mentor", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "university", accountStatus: "active", institutionId: institution._id });
  universityUserId = university.id;
  memberUserId = member.id;
  adminToken = await token(admin);
  universityToken = await token(university);
});

afterAll(async () => {
  if (mongoose.connection.name === database) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("Institution capability profiles and verified rosters", () => {
  it("lets an active institution maintain its profile and keeps it unverified until admin review", async () => {
    const response = await request(app).patch("/api/institutions/me/profile").auth(universityToken, { type: "bearer" }).send({
      description: "Applied civic technology lab",
      domains: ["Sustainability"],
      expertise: ["Route optimization"],
      facilities: ["IoT lab"],
      serviceAreas: ["Pune"],
      departments: [{ name: "Computer Engineering", domains: ["Sustainability"] }],
      maxActiveProjects: 4,
      acceptingWork: true,
    });
    expect(response.status).toBe(200);
    expect(response.body.data.profileStatus).toBe("draft");
    expect(response.body.data.departments).toHaveLength(1);
    expect(response.body.data.departments[0].id).toBeTruthy();

    const verified = await request(app).patch(`/api/admin/institutions/${institutionId}/profile`).auth(adminToken, { type: "bearer" }).send({ profileStatus: "verified" });
    expect(verified.status).toBe(200);
    expect(verified.body.data.profileStatus).toBe("verified");
    expect(verified.body.data.acceptingWork).toBe(true);
  });

  it("prevents cross-institution reads and requires an active institution", async () => {
    const crossInstitution = await request(app).get(`/api/institutions/${otherInstitutionId}/profile`).auth(universityToken, { type: "bearer" });
    expect(crossInstitution.status).toBe(403);

    await Institution.findByIdAndUpdate(institutionId, { $set: { accountStatus: "suspended" } });
    const suspended = await request(app).get("/api/institutions/me/profile").auth(universityToken, { type: "bearer" });
    expect(suspended.status).toBe(403);
    await Institution.findByIdAndUpdate(institutionId, { $set: { accountStatus: "active" } });
  });

  it("allows only the admin to verify a roster member and filters inactive members for institutions", async () => {
    await Institution.findByIdAndUpdate(institutionId, { $set: { accountStatus: "active" } });
    const wrongInstitution = await request(app).post(`/api/admin/institutions/${otherInstitutionId}/roster`).auth(adminToken, { type: "bearer" }).send({ userId: memberUserId, role: "mentor", status: "active" });
    expect(wrongInstitution.status).toBe(403);

    const create = await request(app).post(`/api/admin/institutions/${institutionId}/roster`).auth(adminToken, { type: "bearer" }).send({ userId: memberUserId, role: "mentor", department: "Computer Engineering", status: "active" });
    expect(create.status).toBe(201);
    expect(create.body.data.status).toBe("active");

    const visible = await request(app).get("/api/institutions/me/roster").auth(universityToken, { type: "bearer" });
    expect(visible.status).toBe(200);
    expect(visible.body.data).toHaveLength(1);
    expect(visible.body.data[0].userId).toBe(memberUserId);

    const suspend = await request(app).patch(`/api/admin/institutions/${institutionId}/roster/${memberUserId}`).auth(adminToken, { type: "bearer" }).send({ status: "suspended" });
    expect(suspend.status).toBe(200);
    const hidden = await request(app).get("/api/institutions/me/roster").auth(universityToken, { type: "bearer" });
    expect(hidden.body.data).toEqual([]);
  });

  it("rejects verification for pending institutions and users", async () => {
    const pendingInstitution = await Institution.create({ name: "Pending University", type: "university", accountStatus: "pending" });
    const pendingUser = await User.create({ name: "Pending Member", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "university", accountStatus: "pending", institutionId: pendingInstitution._id });
    const response = await request(app).post(`/api/admin/institutions/${pendingInstitution.id}/roster`).auth(adminToken, { type: "bearer" }).send({ userId: pendingUser.id, role: "student", status: "active" });
    expect(response.status).toBe(400);
    expect(await InstitutionMembership.countDocuments({ institutionId: pendingInstitution._id })).toBe(0);
    expect(universityUserId).toBeTruthy();
  });
});
