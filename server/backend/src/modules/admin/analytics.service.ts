import { Types } from "mongoose";
import { Submission } from "../submissions/submission.model";
import { Project, projectStages, type ProjectStage } from "../projects/project.model";
import { ProjectStageHistory } from "../projects/project-stage-history.model";
import { RoutingAssignment } from "../routing/routing-assignment.model";
import { SupportOffer } from "../industry/support-offer.model";
import { Institution } from "../auth/institution.model";
import { ProposalRevision } from "../projects/proposal.model";

export interface AnalyticsFilters {
  domain?: string;
  district?: string;
  institutionId?: string;
  from?: Date;
  to?: Date;
}

export interface AnalyticsReport {
  generatedAt: string;
  filters: { domain?: string; district?: string; institutionId?: string; from?: string; to?: string };
  submissions: {
    total: number;
    distinct: number;
    duplicateLinked: number;
    resolved: number;
    byStatus: Record<string, number>;
    byDisposition: Record<string, number>;
  };
  projects: { total: number; active: number; closed: number; closureRate: { numerator: number; denominator: number; percent: number } };
  stageFunnel: Array<{ stage: ProjectStage; projects: number }>;
  domains: Array<{ domain: string; submitted: number; inProgress: number; resolved: number; total: number }>;
  districts: Array<{ district: string; total: number; activeProjects: number; resolved: number; engagedInstitutions: number }>;
  engagedInstitutions: { count: number; ids: string[] };
  universities: Array<{ id: string; name: string; challengesAssigned: number; projectsActive: number; proposalsSubmitted: number; solutionsDeployed: number }>;
  industry: Array<{ id: string; name: string; acceptedOffers: number; confirmedCashByCurrency: Record<string, number>; prototypeOffers: number; deploymentOffers: number }>;
  cashCommitments: Array<{ currency: string; pledgedMinor: number; confirmedMinor: number; deliveredMinor: number }>;
  verifiedOutcomes: { patents: number; startups: number; source: "explicit_records_only" };
}

function dateFilter(filters: AnalyticsFilters): Record<string, unknown> {
  if (!filters.from && !filters.to) return {};
  return { createdAt: { ...(filters.from ? { $gte: filters.from } : {}), ...(filters.to ? { $lt: filters.to } : {}) } };
}

function increment(target: Record<string, number>, key: string) { target[key] = (target[key] ?? 0) + 1; }

function percent(numerator: number, denominator: number) { return denominator === 0 ? 0 : Math.round((numerator / denominator) * 10000) / 100; }

function asId(value: Types.ObjectId | string) { return value.toString(); }

export async function buildAnalytics(filters: AnalyticsFilters = {}): Promise<AnalyticsReport> {
  const baseSubmissionQuery: Record<string, unknown> = { ...dateFilter(filters) };
  if (filters.domain) baseSubmissionQuery.domain = filters.domain;
  if (filters.district) baseSubmissionQuery.location = filters.district;
  const initialSubmissions = await Submission.find(baseSubmissionQuery).sort({ createdAt: 1 });
  const initialIds = initialSubmissions.map((submission) => submission._id);
  const assignmentQuery: Record<string, unknown> = { submissionId: { $in: initialIds } };
  if (filters.institutionId) assignmentQuery.institutionId = filters.institutionId;
  const assignmentRows = await RoutingAssignment.find(assignmentQuery);
  const projectQuery: Record<string, unknown> = { submissionId: { $in: initialIds.map(asId) } };
  if (filters.institutionId) projectQuery.institutionId = filters.institutionId;
  const projectRows = await Project.find(projectQuery);

  let submissions = initialSubmissions;
  if (filters.institutionId) {
    const allowed = new Set<string>([
      ...assignmentRows.map((assignment) => asId(assignment.submissionId)),
      ...projectRows.map((project) => project.submissionId).filter((submissionId): submissionId is string => Boolean(submissionId)),
    ]);
    submissions = initialSubmissions.filter((submission) => allowed.has(asId(submission._id)));
  }
  const submissionIds = submissions.map((submission) => submission._id);
  const submissionIdStrings = submissionIds.map(asId);
  const projects = projectRows.filter((project) => project.submissionId && submissionIdStrings.includes(project.submissionId));
  const projectIds = projects.map((project) => project.id);
  const acceptedAssignments = assignmentRows.filter((assignment) => submissionIdStrings.includes(asId(assignment.submissionId)) && assignment.status === "accepted");
  const offers = await SupportOffer.find({ projectId: { $in: projectIds } });
  const acceptedOffers = offers.filter((offer) => offer.status === "accepted");
  const stageHistory = await ProjectStageHistory.find({ projectId: { $in: projectIds } });

  const byStatus: Record<string, number> = {};
  const byDisposition: Record<string, number> = {};
  const domains = new Map<string, { submitted: number; inProgress: number; resolved: number }>();
  const districts = new Map<string, { total: number; resolved: number; submissionIds: Set<string>; engagedInstitutions?: number }>();
  let duplicateLinked = 0;
  for (const submission of submissions) {
    increment(byStatus, submission.status); increment(byDisposition, submission.disposition);
    if (submission.duplicateOf || submission.disposition === "duplicate") duplicateLinked += 1;
    const domainRow = domains.get(submission.domain) ?? { submitted: 0, inProgress: 0, resolved: 0 };
    if (submission.status === "submitted" || submission.status === "under_review") domainRow.submitted += 1;
    if (submission.status === "assigned" || submission.status === "in_progress") domainRow.inProgress += 1;
    if (submission.status === "resolved") domainRow.resolved += 1;
    domains.set(submission.domain, domainRow);
    const districtRow = districts.get(submission.location) ?? { total: 0, resolved: 0, submissionIds: new Set<string>() };
    districtRow.total += 1; if (submission.status === "resolved") districtRow.resolved += 1; districtRow.submissionIds.add(asId(submission._id)); districts.set(submission.location, districtRow);
  }

  const stagesByProject = new Map<string, Set<ProjectStage>>();
  for (const history of stageHistory) { const set = stagesByProject.get(history.projectId) ?? new Set<ProjectStage>(); set.add(history.stage); stagesByProject.set(history.projectId, set); }
  for (const project of projects) {
    const set = stagesByProject.get(project.id) ?? new Set<ProjectStage>();
    const currentIndex = projectStages.indexOf(project.currentStage);
    projectStages.slice(0, currentIndex + 1).forEach((stage) => set.add(stage));
    stagesByProject.set(project.id, set);
  }
  const stageFunnel = projectStages.map((stage) => ({ stage, projects: [...stagesByProject.values()].filter((stages) => stages.has(stage)).length }));

  const engagedIds = new Set<string>(acceptedAssignments.map((assignment) => asId(assignment.institutionId)));
  for (const offer of acceptedOffers) { engagedIds.add(offer.industryInstitutionId); engagedIds.add(offer.universityInstitutionId); }
  const institutions = await Institution.find({ _id: { $in: [...engagedIds].filter((value) => Types.ObjectId.isValid(value)) } }).sort({ name: 1 });
  const institutionNames = new Map(institutions.map((institution) => [asId(institution._id), institution.name]));

  const universityRows = institutions.filter((institution) => institution.type === "university").map((institution) => {
    const institutionId = asId(institution._id); const institutionProjects = projects.filter((project) => project.institutionId === institutionId);
    return { id: institutionId, name: institution.name, challengesAssigned: acceptedAssignments.filter((assignment) => asId(assignment.institutionId) === institutionId).length, projectsActive: institutionProjects.filter((project) => project.closureStatus !== "closed").length, proposalsSubmitted: 0, solutionsDeployed: institutionProjects.filter((project) => stagesByProject.get(project.id)?.has("deployed")).length };
  });
  const proposalCounts = await ProposalRevision.aggregate([{ $match: { projectId: { $in: projects.map((project) => project.id) }, status: { $in: ["submitted", "approved", "returned"] } } }, { $group: { _id: "$projectId", count: { $sum: 1 } } }]);
  const proposalCountByProject = new Map(proposalCounts.map((row) => [String(row._id), Number(row.count)]));
  for (const row of universityRows) row.proposalsSubmitted = projects.filter((project) => project.institutionId === row.id).reduce((sum, project) => sum + (proposalCountByProject.get(project.id) ?? 0), 0);

  const cashMap = new Map<string, { pledgedMinor: number; confirmedMinor: number; deliveredMinor: number }>();
  for (const offer of offers) {
    if (offer.amountMinor === undefined || !offer.currency) continue;
    const row = cashMap.get(offer.currency) ?? { pledgedMinor: 0, confirmedMinor: 0, deliveredMinor: 0 };
    if (offer.status === "pending") row.pledgedMinor += offer.amountMinor;
    if (offer.status === "accepted") row.confirmedMinor += offer.amountMinor;
    cashMap.set(offer.currency, row);
  }
  const industryMap = new Map<string, { acceptedOffers: number; confirmedCashByCurrency: Record<string, number>; prototypeOffers: number; deploymentOffers: number }>();
  for (const offer of acceptedOffers) {
    const row = industryMap.get(offer.industryInstitutionId) ?? { acceptedOffers: 0, confirmedCashByCurrency: {}, prototypeOffers: 0, deploymentOffers: 0 };
    row.acceptedOffers += 1; if (offer.amountMinor !== undefined && offer.currency) row.confirmedCashByCurrency[offer.currency] = (row.confirmedCashByCurrency[offer.currency] ?? 0) + offer.amountMinor;
    if (offer.supportType === "prototyping") row.prototypeOffers += 1; if (offer.supportType === "deployment") row.deploymentOffers += 1; industryMap.set(offer.industryInstitutionId, row);
  }
  const industry = [...industryMap.entries()].map(([id, row]) => ({ id, name: institutionNames.get(id) ?? "Industry institution", ...row }));
  for (const [district, row] of districts) {
    const districtProjects = projects.filter((project) => { const submission = submissions.find((candidate) => asId(candidate._id) === project.submissionId); return submission?.location === district; });
    const districtEngaged = new Set<string>(); districtProjects.forEach((project) => districtEngaged.add(project.institutionId));
    acceptedAssignments.filter((assignment) => row.submissionIds.has(asId(assignment.submissionId))).forEach((assignment) => districtEngaged.add(asId(assignment.institutionId)));
    row.engagedInstitutions = districtEngaged.size;
  }

  const cohortProjects = projects.length;
  const closedProjects = projects.filter((project) => project.closureStatus === "closed").length;
  return {
    generatedAt: new Date().toISOString(),
    filters: { ...(filters.domain ? { domain: filters.domain } : {}), ...(filters.district ? { district: filters.district } : {}), ...(filters.institutionId ? { institutionId: filters.institutionId } : {}), ...(filters.from ? { from: filters.from.toISOString() } : {}), ...(filters.to ? { to: filters.to.toISOString() } : {}) },
    submissions: { total: submissions.length, distinct: submissions.length - duplicateLinked, duplicateLinked, resolved: submissions.filter((submission) => submission.status === "resolved").length, byStatus, byDisposition },
    projects: { total: projects.length, active: projects.filter((project) => project.closureStatus !== "closed").length, closed: closedProjects, closureRate: { numerator: closedProjects, denominator: cohortProjects, percent: percent(closedProjects, cohortProjects) } },
    stageFunnel,
    domains: [...domains.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([domain, row]) => ({ domain, ...row, total: row.submitted + row.inProgress + row.resolved })),
    districts: [...districts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([district, row]) => ({ district, total: row.total, activeProjects: projects.filter((project) => project.closureStatus !== "closed" && submissions.find((submission) => asId(submission._id) === project.submissionId)?.location === district).length, resolved: row.resolved, engagedInstitutions: row.engagedInstitutions ?? 0 })),
    engagedInstitutions: { count: engagedIds.size, ids: [...engagedIds].sort() },
    universities: universityRows,
    industry,
    cashCommitments: [...cashMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([currency, row]) => ({ currency, ...row })),
    verifiedOutcomes: { patents: 0, startups: 0, source: "explicit_records_only" },
  };
}

function csvCell(value: unknown) { const text = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }

export function analyticsCsv(report: AnalyticsReport) {
  const rows: Array<[string, string, unknown]> = [
    ["summary", "submissions.total", report.submissions.total], ["summary", "submissions.distinct", report.submissions.distinct], ["summary", "submissions.duplicateLinked", report.submissions.duplicateLinked], ["summary", "submissions.resolved", report.submissions.resolved],
    ["summary", "projects.total", report.projects.total], ["summary", "projects.active", report.projects.active], ["summary", "projects.closed", report.projects.closed], ["summary", "projects.closureRatePercent", report.projects.closureRate.percent], ["summary", "engagedInstitutions", report.engagedInstitutions.count],
  ];
  for (const [status, count] of Object.entries(report.submissions.byStatus)) rows.push(["submission_status", status, count]);
  for (const row of report.domains) rows.push(["domain", row.domain, row.total]);
  for (const row of report.districts) rows.push(["district", row.district, row.total]);
  for (const row of report.stageFunnel) rows.push(["stage_funnel", row.stage, row.projects]);
  for (const row of report.cashCommitments) { rows.push(["cash_pledged_minor", row.currency, row.pledgedMinor]); rows.push(["cash_confirmed_minor", row.currency, row.confirmedMinor]); rows.push(["cash_delivered_minor", row.currency, row.deliveredMinor]); }
  return ["section,key,value", ...rows.map((row) => row.map(csvCell).join(","))].join("\n") + "\n";
}
