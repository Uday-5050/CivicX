import { Types } from "mongoose";
import { randomUUID } from "node:crypto";
import { withMongoTransaction } from "../../utils/transactions";
import { ConflictError, NotFoundError } from "../../utils/errors";
import { recordAuditEvent } from "../audit/audit.service";
import { recordSubmissionActivity } from "../submissions/submission-activity.service";
import { Institution } from "../auth/institution.model";
import { Project } from "../projects/project.model";
import { ProjectMembership } from "../projects/project-membership.model";
import { Submission } from "../submissions/submission.model";
import { RoutingAssignment, type RoutingAssignmentDocument } from "../routing/routing-assignment.model";
import { recordProjectStage } from "../projects/project-stage-history.service";

export type AssignmentDecision = "accepted" | "declined" | "info_requested";

export async function decideRoutingAssignment(input: {
  assignmentId: string;
  institutionId: string;
  userId: string;
  decision: AssignmentDecision;
  expectedVersion: number;
  reason?: string;
  question?: string;
}) {
  const existing = await RoutingAssignment.findOne({ assignmentId: input.assignmentId, institutionId: input.institutionId });
  if (!existing) throw NotFoundError("Assignment not found");
  if ((input.decision === "accepted" || input.decision === "declined") && existing.status === input.decision) {
    const project = input.decision === "accepted" ? await Project.findOne({ challengeId: input.assignmentId }) : null;
    return { assignment: existing, project, reused: true };
  }
  if (existing.status !== "pending" || existing.version !== input.expectedVersion) throw ConflictError("This assignment changed or already has a decision");
  if (!Types.ObjectId.isValid(input.institutionId)) throw NotFoundError("Institution not found");

  return withMongoTransaction(async (session) => {
    const assignment = await RoutingAssignment.findOneAndUpdate(
      { assignmentId: input.assignmentId, institutionId: input.institutionId, status: "pending", isActive: true, version: input.expectedVersion },
      input.decision === "info_requested"
        ? { $set: { clarification: { requestedBy: new Types.ObjectId(input.userId), question: input.question, requestedAt: new Date() } }, $inc: { version: 1 } }
        : { $set: { status: input.decision, isActive: false, decidedBy: new Types.ObjectId(input.userId), decisionReason: input.reason, decidedAt: new Date() }, $inc: { version: 1 } },
      { new: true, runValidators: true, session },
    );
    if (!assignment) throw ConflictError("This assignment changed or was already decided");
    const submission = await Submission.findById(assignment.submissionId).session(session ?? null);
    if (!submission) throw NotFoundError("Source submission not found");
    let project: InstanceType<typeof Project> | null = null;
    if (input.decision === "accepted") {
      const projectId = randomUUID();
      const [created] = await Project.create([{
        id: projectId,
        challengeId: assignment.assignmentId,
        submissionId: submission._id.toString(),
        institutionId: assignment.institutionId.toString(),
        title: submission.title,
        summary: submission.description,
        domain: submission.domain,
        department: assignment.departmentName,
        team: { leadId: input.userId, mentorId: "", studentIds: [] },
        currentStage: "proposed",
        version: 1,
        evidence: {},
        deliverables: [],
        ipDisclosures: [],
        testRecords: [],
      }], { session });
      project = created;
      await recordProjectStage(project.id, "proposed", "acceptance", session);
      await ProjectMembership.create([{
        projectId: project.id,
        userId: new Types.ObjectId(input.userId),
        institutionId: assignment.institutionId,
        role: "lead",
        status: "active",
        department: assignment.departmentName,
        addedBy: new Types.ObjectId(input.userId),
      }], { session });
      const updatedSubmission = await Submission.updateOne({ _id: submission._id, status: { $in: ["submitted", "under_review"] } }, { $set: { status: "assigned" } }, { session });
      if (updatedSubmission.modifiedCount !== 1) throw ConflictError("The source submission is no longer available for assignment");
      await Institution.updateOne({ _id: assignment.institutionId, routingReservations: { $gt: 0 } }, { $inc: { routingReservations: -1 } }, { session });
    } else if (input.decision === "declined") {
      await Institution.updateOne({ _id: assignment.institutionId, routingReservations: { $gt: 0 } }, { $inc: { routingReservations: -1 } }, { session });
    }
    const messages: Record<AssignmentDecision, string> = { accepted: "University accepted the routed report", declined: "University declined the routed report", info_requested: "University requested clarification about the routed report" };
    await recordSubmissionActivity({ submissionId: submission._id, eventType: `routing_${input.decision}`, message: messages[input.decision], actorId: input.userId, actorRole: "university", metadata: { assignmentId: assignment.assignmentId, projectId: project?.id, question: input.question } }, session);
    await recordAuditEvent({ actorId: input.userId, actorRole: "university", action: `routing.${input.decision}`, entityType: "routing_assignment", entityId: assignment.assignmentId, metadata: { submissionId: submission._id.toString(), projectId: project?.id, question: input.question, reason: input.reason } }, session);
    return { assignment, project, reused: false };
  });
}

export function serializeAssignment(assignment: RoutingAssignmentDocument) {
  return {
    id: assignment.assignmentId,
    submissionId: assignment.submissionId.toString(),
    institutionId: assignment.institutionId.toString(),
    departmentId: assignment.departmentId,
    departmentName: assignment.departmentName,
    status: assignment.status,
    version: assignment.version,
    isActive: assignment.isActive,
    reason: assignment.reason,
    clarification: assignment.clarification,
    matchSnapshot: assignment.matchSnapshot,
    assignedBy: assignment.assignedBy.toString(),
    decidedBy: assignment.decidedBy?.toString(),
    decisionReason: assignment.decisionReason,
    decidedAt: assignment.decidedAt,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
  };
}
