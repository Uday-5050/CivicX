import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { UniversityChallenge } from "../src/modules/university/university.model";
import { Project } from "../src/modules/projects/project.model";
import { Submission } from "../src/modules/submissions/submission.model";
import { User } from "../src/modules/auth/user.model";
import { rehearseLegacyMigration } from "../src/modules/migrations/legacy-challenge-migration.service";

const database = `civicx_test_migration_${randomUUID().replaceAll("-", "")}`;

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017", { dbName: database, serverSelectionTimeoutMS: 5000 });
});
afterAll(async () => {
  if (mongoose.connection.name === database) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
beforeEach(async () => {
  await Promise.all([UniversityChallenge.deleteMany({}), Project.deleteMany({}), Submission.deleteMany({}), User.deleteMany({})]);
});

async function submission(submitterId: mongoose.Types.ObjectId) {
  return Submission.create({ submitterId, idempotencyKey: randomUUID(), title: "Legacy report", description: "A report retained for migration rehearsal.", domain: "Water", location: "Ward 4", submitterType: "citizen", attachments: [], status: "under_review", analysis: { status: "completed", category: "Water", priority: "medium", summary: "Water report" }, comments: [], upvotes: 0 });
}

function challenge(input: Record<string, unknown>) {
  return UniversityChallenge.create({ institutionId: randomUUID(), title: "Legacy challenge", summary: "Legacy summary", domain: "Water", priority: "medium", department: "Water Lab", organization: "Legacy University", decision: "pending", ...input });
}

describe("Task 16 legacy migration rehearsal", () => {
  it("reports safe mappings and blocks missing or ambiguous references without writing", async () => {
    const citizen = await User.create({ name: "Synthetic citizen", email: `${randomUUID()}@example.test`, passwordHash: "unused", role: "citizen", accountStatus: "active" });
    const source = await submission(citizen._id);
    const mappedProjectId = randomUUID();
    const mapped = await challenge({ decision: "accepted", sourceSubmissionId: source._id.toString(), project: { id: mappedProjectId, status: "active", createdAt: new Date() } });
    await Project.create({ id: mappedProjectId, challengeId: mapped._id.toString(), submissionId: source._id.toString(), institutionId: randomUUID(), title: "Mapped project", summary: "Already migrated", domain: "Water", department: "Water Lab", team: { leadId: randomUUID(), mentorId: "", studentIds: [] }, currentStage: "proposed", version: 1, evidence: {}, deliverables: [], ipDisclosures: [], testRecords: [] });
    const missingProject = await challenge({ decision: "accepted", sourceSubmissionId: source._id.toString() });
    const missingSource = await challenge({ decision: "accepted", project: { id: randomUUID(), status: "active", createdAt: new Date() } });
    const pending = await challenge({ decision: "pending" });
    expect(mapped._id).toBeTruthy(); expect(missingProject._id).toBeTruthy(); expect(missingSource._id).toBeTruthy(); expect(pending._id).toBeTruthy();

    const before = await UniversityChallenge.countDocuments();
    const report = await rehearseLegacyMigration();
    expect(report.legacyTotal).toBe(4);
    expect(report.alreadyMapped).toBe(1);
    expect(report.missingProjectReference).toBe(1);
    expect(report.missingSourceSubmission).toBe(1);
    expect(report.blocked).toBe(2);
    expect(report.safeToApply).toBe(false);
    expect(report.records.some((record) => record.action === "already_mapped")).toBe(true);
    expect(await UniversityChallenge.countDocuments()).toBe(before);
  });
});
