import { Types } from "mongoose";
import { UniversityChallenge } from "../university/university.model";
import { Project } from "../projects/project.model";
import { Submission } from "../submissions/submission.model";

export type LegacyMigrationAction = "already_mapped" | "would_map" | "blocked" | "not_project_work";

export interface LegacyMigrationRecord {
  challengeId: string;
  decision: string;
  action: LegacyMigrationAction;
  projectId?: string;
  sourceSubmissionId?: string;
  reason?: string;
}

export interface LegacyMigrationReport {
  generatedAt: string;
  legacyTotal: number;
  acceptedWithProject: number;
  pending: number;
  declined: number;
  infoRequested: number;
  alreadyMapped: number;
  wouldMap: number;
  blocked: number;
  missingSourceSubmission: number;
  missingProjectReference: number;
  ambiguous: number;
  safeToApply: boolean;
  records: LegacyMigrationRecord[];
}

/**
 * Read-only rehearsal for the legacy UniversityChallenge collection.
 * It deliberately does not create or update any records. A future apply
 * migration must use the records marked would_map and retain both references.
 */
export async function rehearseLegacyMigration(): Promise<LegacyMigrationReport> {
  const legacyRows = await UniversityChallenge.find().lean();
  const report: LegacyMigrationReport = {
    generatedAt: new Date().toISOString(),
    legacyTotal: legacyRows.length,
    acceptedWithProject: 0,
    pending: 0,
    declined: 0,
    infoRequested: 0,
    alreadyMapped: 0,
    wouldMap: 0,
    blocked: 0,
    missingSourceSubmission: 0,
    missingProjectReference: 0,
    ambiguous: 0,
    safeToApply: true,
    records: [],
  };

  for (const row of legacyRows) {
    const challengeId = row._id.toString();
    if (row.decision !== "accepted") {
      if (row.decision === "pending") report.pending += 1;
      else if (row.decision === "declined") report.declined += 1;
      else if (row.decision === "info_requested") report.infoRequested += 1;
      report.records.push({ challengeId, decision: row.decision, action: "not_project_work" });
      continue;
    }

    report.acceptedWithProject += 1;
    const projectId = row.project?.id;
    const sourceSubmissionId = row.sourceSubmissionId;
    if (!projectId) {
      report.missingProjectReference += 1;
      report.blocked += 1;
      report.safeToApply = false;
      report.records.push({ challengeId, decision: row.decision, action: "blocked", reason: "accepted challenge has no project reference" });
      continue;
    }
    if (!sourceSubmissionId || !Types.ObjectId.isValid(sourceSubmissionId) || !await Submission.exists({ _id: sourceSubmissionId })) {
      report.missingSourceSubmission += 1;
      report.blocked += 1;
      report.safeToApply = false;
      report.records.push({ challengeId, decision: row.decision, action: "blocked", projectId, sourceSubmissionId, reason: "accepted challenge has no existing source submission" });
      continue;
    }

    const projectWithId = await Project.findOne({ id: projectId }).lean();
    if (projectWithId) {
      // Legacy challenge IDs may differ from the modern assignment ID. The
      // stable source submission link is the authoritative identity check.
      if (projectWithId.submissionId !== sourceSubmissionId) {
        report.ambiguous += 1;
        report.blocked += 1;
        report.safeToApply = false;
        report.records.push({ challengeId, decision: row.decision, action: "blocked", projectId, sourceSubmissionId, reason: "project id exists but references a different source submission" });
      } else {
        report.alreadyMapped += 1;
        report.records.push({ challengeId, decision: row.decision, action: "already_mapped", projectId, sourceSubmissionId });
      }
      continue;
    }

    const projectForSubmission = await Project.exists({ submissionId: sourceSubmissionId });
    if (projectForSubmission) {
      report.ambiguous += 1;
      report.blocked += 1;
      report.safeToApply = false;
      report.records.push({ challengeId, decision: row.decision, action: "blocked", projectId, sourceSubmissionId, reason: "source submission already has another project" });
      continue;
    }

    report.wouldMap += 1;
    report.records.push({ challengeId, decision: row.decision, action: "would_map", projectId, sourceSubmissionId });
  }

  return report;
}
