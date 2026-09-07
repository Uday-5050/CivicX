import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import request from "supertest";
import app from "../src/app";
import { User } from "../src/modules/auth/user.model";
import { signAccessToken } from "../src/modules/auth/auth.service";
import { uploadDirectory } from "../src/modules/submissions/upload.middleware";

const database = `civicx_test_submissions_${randomUUID().replaceAll("-", "")}`;
let citizenToken: string;
let otherCitizenToken: string;
const report = { title: "Unsafe school crossing", description: "Cars speed near the school crossing and students need a safer crossing immediately.", domain: "Public safety", location: "Ranchi Ward 12", submitterType: "citizen", attachments: [], idempotencyKey: "school-crossing" };

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017", { dbName: database, serverSelectionTimeoutMS: 5000 });
  async function token(email: string) {
    const user = await User.create({ name: "Test citizen", email, passwordHash: "unused", role: "citizen", accountStatus: "active" });
    return signAccessToken(user);
  }
  citizenToken = await token(`${randomUUID()}@example.test`);
  otherCitizenToken = await token(`${randomUUID()}@example.test`);
});

afterAll(async () => {
  if (mongoose.connection.name === database) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("Citizen submissions", () => {
  it("stores a report and returns it only to its submitter", async () => {
    const created = await request(app).post("/api/submissions").auth(citizenToken, { type: "bearer" }).send(report);
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe("submitted");
    expect(created.body.data.submitterType).toBe("citizen");
    const own = await request(app).get("/api/submissions").auth(citizenToken, { type: "bearer" });
    expect(own.body.data).toHaveLength(1);
    expect(own.body.data[0].id).toBe(created.body.data.id);
    const other = await request(app).get("/api/submissions").auth(otherCitizenToken, { type: "bearer" });
    expect(other.body.data).toEqual([]);
  });

  it("returns the original submission for the same idempotency key", async () => {
    const first = await request(app).post("/api/submissions").auth(citizenToken, { type: "bearer" }).send({ ...report, idempotencyKey: "same-report" });
    const repeat = await request(app).post("/api/submissions").auth(citizenToken, { type: "bearer" }).send({ ...report, idempotencyKey: "same-report" });
    expect(first.status).toBe(201);
    expect(repeat.status).toBe(200);
    expect(repeat.body.data.id).toBe(first.body.data.id);
  });

  it("stores an uploaded image and returns a backend URL", async () => {
    const response = await request(app)
      .post("/api/submissions")
      .auth(citizenToken, { type: "bearer" })
      .field("title", report.title)
      .field("description", report.description)
      .field("domain", report.domain)
      .field("location", report.location)
      .field("idempotencyKey", "photo-report")
      .attach("attachments", Buffer.from([0xff, 0xd8, 0xff, 0xd9]), { filename: "report.jpg", contentType: "image/jpeg" });
    expect(response.status).toBe(201);
    const attachment = response.body.data.attachments[0];
    expect(attachment.previewUrl).toMatch(/^\/api\/uploads\//);
    expect((await request(app).get(attachment.previewUrl)).status).toBe(200);
    await rm(resolve(uploadDirectory, attachment.id));
  });

  it("requires an authenticated citizen", async () => {
    expect((await request(app).post("/api/submissions").send(report)).status).toBe(401);
  });
});
