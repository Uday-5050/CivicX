import { Institution } from "../auth/institution.model";
import { Submission } from "../submissions/submission.model";
import { UniversityChallenge, type ChallengeDocument } from "../university/university.model";

export function projectStage(challenge: ChallengeDocument) {
  return challenge.governmentStage ?? (challenge.project ? "in_progress" : "submitted");
}

// Read only fields used by the dashboard; citizen identities and evidence are excluded.
export async function dashboard() {
  const [institutions, assignments, submissions] = await Promise.all([
    Institution.find({ accountStatus: "active" }).lean(),
    UniversityChallenge.find().sort({ updatedAt: -1 }).lean(),
    Submission.find().select("title domain status analysis.priority createdAt updatedAt").lean(),
  ]);
  const names = new Map(institutions.map(i => [String(i._id), i.name]));
  const projects = assignments.filter(c => c.project).map(c => ({
    id: c.project!.id, challengeId: String(c._id), title: c.title,
    university: names.get(c.institutionId) ?? "Unavailable institution",
    industry: c.industryId ? names.get(c.industryId) ?? "Unavailable institution" : "Not assigned",
    domain: c.domain, district: c.district ?? "Unspecified", stage: projectStage(c),
    startDate: c.project!.createdAt, lastUpdated: c.updatedAt, version: c.version,
  }));
  const challenges = [
    ...submissions.map(c => ({ id: String(c._id), title: c.title, domain: c.domain,
      district: "Unspecified", status: c.status, priority: c.analysis?.priority ?? "medium",
      university: "Not assigned", submittedAt: c.createdAt })),
    ...assignments.map(c => ({ id: String(c._id), title: c.title, domain: c.domain,
      district: c.district ?? "Unspecified", status: c.project ? projectStage(c) : c.decision === "pending" ? "submitted" : c.decision,
      priority: c.priority, university: names.get(c.institutionId) ?? "Unavailable institution", submittedAt: c.createdAt })),
  ].sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  const resolved = (status: string) => ["resolved", "deployed"].includes(status);
  const domains = [...new Set(challenges.map(c => c.domain))].map(domain => {
    const rows = challenges.filter(c => c.domain === domain);
    return { id: domain, domain, submitted: rows.filter(c => c.status === "submitted").length,
      inProgress: rows.filter(c => !resolved(c.status) && !["submitted", "declined"].includes(c.status)).length,
      resolved: rows.filter(c => resolved(c.status)).length, color: "#2563eb" };
  });
  const districts = [...new Set(challenges.map(c => c.district))].map(district => {
    const rows = challenges.filter(c => c.district === district);
    const linked = assignments.filter(c => (c.district ?? "Unspecified") === district);
    return { id: district, district, totalChallenges: rows.length,
      activeProjects: projects.filter(p => p.district === district && p.stage !== "deployed").length,
      resolved: rows.filter(c => resolved(c.status)).length,
      universitiesEngaged: new Set(linked.map(c => c.institutionId)).size,
      industryPartners: new Set(linked.map(c => c.industryId).filter(Boolean)).size };
  });
  const universities = institutions.filter(i => i.type === "university").map(i => {
    const rows = assignments.filter(c => c.institutionId === String(i._id));
    return { id: String(i._id), name: i.name, challengesAssigned: rows.length,
      projectsActive: rows.filter(c => c.project && projectStage(c) !== "deployed").length,
      proposalsSubmitted: rows.filter(c => c.proposal).length,
      solutionsDeployed: rows.filter(c => c.project && projectStage(c) === "deployed").length,
      patents: i.metrics?.patents ?? 0, startupsIncubated: i.metrics?.startupsIncubated ?? 0 };
  });
  const industry = institutions.filter(i => i.type === "industry").map(i => ({
    id: String(i._id), name: i.name, type: i.metrics?.industryType ?? "unclassified", sector: i.metrics?.sector ?? "Unspecified",
    fundingLakhs: i.metrics?.fundingLakhs ?? 0, mentorshipHours: i.metrics?.mentorshipHours ?? 0,
    prototypes: assignments.filter(c => c.industryId === String(i._id) && c.project && projectStage(c) === "pilot").length,
    deployments: assignments.filter(c => c.industryId === String(i._id) && c.project && projectStage(c) === "deployed").length,
  }));
  const now = new Date();
  const trends = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const within = (date: Date) => date >= start && date < end;
    return { month: start.toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" }),
      submitted: challenges.filter(c => within(c.submittedAt)).length,
      resolved: assignments.filter(c => c.project && projectStage(c) === "deployed" &&
        (c.reviews ?? []).some(r => r.stage === "deployed" && within(r.createdAt))).length };
  });
  const activity = [
    ...challenges.map(c => ({ id: `challenge-${c.id}`, message: `Challenge submitted: ${c.title}`, type: "challenge", timestamp: c.submittedAt })),
    ...assignments.flatMap(c => (c.reviews ?? []).map(r => ({ id: r.id, message: `${c.title}: ${r.stage.replaceAll("_", " ")}`, type: "milestone", timestamp: r.createdAt }))),
    ...projects.map(p => ({ id: `project-${p.id}`, message: `Project started: ${p.title}`, type: "project", timestamp: p.startDate })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 50);
  const kpis = [
    { id: "challenges", label: "Total challenges", value: challenges.length, change: 0, icon: "📋" },
    { id: "projects", label: "Active projects", value: projects.filter(p => p.stage !== "deployed").length, change: 0, icon: "🔬" },
    { id: "resolved", label: "Resolved challenges", value: challenges.filter(c => resolved(c.status)).length, change: 0, icon: "✓" },
    { id: "universities", label: "Active universities", value: universities.length, change: 0, icon: "🏛" },
    { id: "industry", label: "Industry partners", value: industry.length, change: 0, icon: "🏭" },
  ];
  return { kpis, domains, districts, universities, industry, projects, trends, challenges, activity };
}

export function csv(rows: object[]): string {
  if (!rows.length) return "No records\r\n";
  const columns = Object.keys(rows[0]);
  const cell = (value: unknown) => {
    let text = value instanceof Date ? value.toISOString() : String(value ?? "");
    if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [columns.map(cell).join(","), ...rows.map(row => columns.map(key => cell((row as Record<string, unknown>)[key])).join(","))].join("\r\n");
}
