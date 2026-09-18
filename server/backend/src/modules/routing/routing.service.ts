import { randomUUID } from "node:crypto";
import { Project } from "../projects/project.model";
import { Submission } from "../submissions/submission.model";
import { ClassificationResult } from "../classification/classification-result.model";
import { Institution } from "../auth/institution.model";
import { RoutingAssignment, type RoutingAssignmentDocument, type RoutingMatchComponent } from "./routing-assignment.model";
import { ConflictError } from "../../utils/errors";

const weights = { domain: 40, expertise: 30, facilities: 15, serviceArea: 10, capacity: 5 } as const;

function terms(value: string): string[] {
  return value.toLowerCase().split(/[^a-z0-9]+/).map((term) => term.trim()).filter((term) => term.length >= 3);
}

function overlap(left: string[], right: string[]) {
  const rightTerms = new Set(right.flatMap(terms));
  return [...new Set(left.flatMap(terms))].filter((term) => rightTerms.has(term));
}

function component(name: RoutingMatchComponent["name"], points: number, maximum: number, reasons: string[]): RoutingMatchComponent {
  return { name, points, maximum, reasons };
}

export interface Recommendation {
  institutionId: string;
  institutionName: string;
  departments: Array<{ id: string; name: string; domains: string[] }>;
  score: number;
  components: RoutingMatchComponent[];
  availableCapacity: number;
  activeProjects: number;
  reservedAssignments: number;
}

export async function recommendUniversities(submissionId: string): Promise<{ submissionId: string; candidates: Recommendation[]; noMatch: boolean }> {
  const submission = await Submission.findById(submissionId);
  if (!submission) return { submissionId, candidates: [], noMatch: true };
  const classification = await ClassificationResult.findOne({ submissionId: submission._id });
  const sourceText = `${submission.title} ${submission.description} ${submission.domain} ${classification?.category ?? ""} ${(classification?.signals ?? []).join(" ")}`;
  const sourceTerms = terms(sourceText);
  const institutions = await Institution.find({ type: "university", accountStatus: "active", profileStatus: "verified", acceptingWork: true }).sort({ _id: 1 });
  const candidates: Recommendation[] = [];
  for (const institution of institutions) {
    const [activeProjects, reservedAssignments] = await Promise.all([
      Project.countDocuments({ institutionId: institution._id.toString(), currentStage: { $ne: "deployed" } }),
      RoutingAssignment.countDocuments({ institutionId: institution._id, isActive: true }),
    ]);
    const reserved = Math.max(institution.routingReservations, reservedAssignments);
    const availableCapacity = Math.max(0, institution.maxActiveProjects - activeProjects - reserved);
    if (availableCapacity <= 0) continue;
    const domainOverlap = overlap([submission.domain, classification?.category ?? ""], institution.domains);
    const domainPoints = domainOverlap.length ? weights.domain : 0;
    const expertiseOverlap = overlap(sourceTerms, institution.expertise);
    const expertisePoints = Math.min(weights.expertise, expertiseOverlap.length * 10);
    const facilityOverlap = overlap(sourceTerms, institution.facilities);
    const facilityPoints = Math.min(weights.facilities, facilityOverlap.length * 5);
    const areaOverlap = overlap([submission.location], institution.serviceAreas);
    const areaPoints = areaOverlap.length ? weights.serviceArea : 0;
    const capacityPoints = availableCapacity > 0 ? weights.capacity : 0;
    if (domainPoints === 0 && expertisePoints === 0 && facilityPoints === 0 && areaPoints === 0) continue;
    const components = [
      component("domain", domainPoints, weights.domain, domainOverlap.length ? [`Domain matches ${domainOverlap.join(", ")}`] : ["No verified domain match"]),
      component("expertise", expertisePoints, weights.expertise, expertiseOverlap.length ? [`Expertise matches ${expertiseOverlap.join(", ")}`] : ["No matching expertise tags"]),
      component("facilities", facilityPoints, weights.facilities, facilityOverlap.length ? [`Facilities match ${facilityOverlap.join(", ")}`] : ["No matching facility tags"]),
      component("serviceArea", areaPoints, weights.serviceArea, areaOverlap.length ? [`Service area matches ${areaOverlap.join(", ")}`] : ["No location match recorded"]),
      component("capacity", capacityPoints, weights.capacity, [`${availableCapacity} active project slot${availableCapacity === 1 ? "" : "s"} available`]),
    ];
    candidates.push({ institutionId: institution._id.toString(), institutionName: institution.name, departments: institution.departments.filter((department) => department.active).map(({ id, name, domains }) => ({ id, name, domains })), score: components.reduce((sum, item) => sum + item.points, 0), components, availableCapacity, activeProjects, reservedAssignments: reserved });
  }
  candidates.sort((left, right) => right.score - left.score || left.activeProjects - right.activeProjects || left.institutionId.localeCompare(right.institutionId));
  return { submissionId, candidates: candidates.slice(0, 3), noMatch: candidates.length === 0 };
}

export async function createRoutingAssignment(input: {
  submissionId: string;
  institutionId: string;
  departmentId: string;
  reason?: string;
  assignedBy: string;
}) {
  const submission = await Submission.findById(input.submissionId);
  if (!submission) throw ConflictError("Submission not found");
  if (submission.disposition !== "active") throw ConflictError("Only active submissions can be routed");
  if (submission.status !== "under_review") throw ConflictError("The submission must be reviewed before routing");
  const institution = await Institution.findOne({ _id: input.institutionId, type: "university", accountStatus: "active", profileStatus: "verified", acceptingWork: true });
  if (!institution) throw ConflictError("Target university is not active, verified, or accepting work");
  const department = institution.departments.find((entry) => entry.id === input.departmentId && entry.active);
  if (!department) throw ConflictError("The selected department is not active at this university");
  const activeProjects = await Project.countDocuments({ institutionId: institution._id.toString(), currentStage: { $ne: "deployed" } });
  if (activeProjects + institution.routingReservations >= institution.maxActiveProjects) throw ConflictError("This university has no available project capacity");
  const recommendations = await recommendUniversities(input.submissionId);
  const selected = recommendations.candidates.find((candidate) => candidate.institutionId === input.institutionId);
  if (!selected && !input.reason) throw ConflictError("An explicit reason is required when routing outside the recommendations");
  const reserved = await Institution.findOneAndUpdate(
    { _id: institution._id, $expr: { $lt: [{ $ifNull: ["$routingReservations", 0] }, "$maxActiveProjects"] } },
    { $inc: { routingReservations: 1 } },
    { new: true },
  );
  if (!reserved) throw ConflictError("This university has no available project capacity");
  try {
    const assignment = await RoutingAssignment.create({ assignmentId: randomUUID(), submissionId: submission._id, institutionId: institution._id, departmentId: department.id, departmentName: department.name, status: "pending", version: 1, isActive: true, reason: input.reason, matchSnapshot: selected ? { score: selected.score, components: selected.components, generatedAt: new Date() } : { score: 0, components: [], generatedAt: new Date() }, assignedBy: input.assignedBy });
    return assignment;
  } catch (error: unknown) {
    await Institution.updateOne({ _id: institution._id, routingReservations: { $gt: 0 } }, { $inc: { routingReservations: -1 } });
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === 11000) throw ConflictError("This submission already has an active routing assignment");
    throw error;
  }
}

export function serializeRoutingAssignment(assignment: RoutingAssignmentDocument) {
  return { id: assignment.assignmentId, submissionId: assignment.submissionId.toString(), institutionId: assignment.institutionId.toString(), departmentId: assignment.departmentId, departmentName: assignment.departmentName, status: assignment.status, version: assignment.version, reason: assignment.reason, matchSnapshot: assignment.matchSnapshot, assignedBy: assignment.assignedBy.toString(), decidedBy: assignment.decidedBy?.toString(), decisionReason: assignment.decisionReason, decidedAt: assignment.decidedAt, createdAt: assignment.createdAt, updatedAt: assignment.updatedAt };
}
