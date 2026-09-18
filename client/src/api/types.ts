import type { Role } from '../constants/roles';
import type { IssueStatus, IssuePriority, IssueCategory } from '../constants/status';

export type { Role, IssueStatus, IssuePriority, IssueCategory };

export interface ResponseMeta {
  requestId?: string;
  timestamp?: string;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

export interface ErrorDetail {
  field?: string;
  message: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
  details?: ErrorDetail[];
}

export interface ErrorResponse {
  success: false;
  error: ErrorPayload;
  meta?: ResponseMeta;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: 'development' | 'staging' | 'production';
  version?: string;
  mongo?: 'connected' | 'disconnected';
}

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'fallback' | 'failed';
export type SubmissionStatus = 'draft' | 'submitted' | 'under_review' | 'assigned' | 'in_progress' | 'resolved';
export type SubmissionDisposition = 'active' | 'duplicate' | 'rejected' | 'referred';

export interface SubmissionAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
}

export interface SubmissionAnalysis {
  status: AnalysisStatus;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  summary?: string;
  error?: string;
  provider?: string;
  revision?: number;
}

export interface ClassificationRevision {
  resultId: string; jobId: string; provider: string; requestedProvider?: string; model?: string; promptVersion?: string; revision: number;
  category: string; priority: 'low' | 'medium' | 'high'; summary: string; signals: string[]; durationMs?: number; fallbackReason?: string; createdAt: string;
}
export interface AdminClassificationAnalysis {
  job?: { jobId: string; status: 'pending' | 'running' | 'completed' | 'failed'; requestedProvider: string; attempts: number; lastError?: string; createdAt: string; completedAt?: string };
  current?: ClassificationRevision;
  revisions: ClassificationRevision[];
}

export interface Submission {
  id: string;
  idempotencyKey: string;
  title: string;
  description: string;
  domain: string;
  location: string;
  submitterType: Role;
  attachments: SubmissionAttachment[];
  status: SubmissionStatus;
  disposition?: SubmissionDisposition;
  duplicateOf?: string;
  analysis: SubmissionAnalysis;
  comments: number;
  upvotes: number;
  hasUpvoted: boolean;
  createdAt: string;
}

export type ChallengePriority = 'low' | 'medium' | 'high';
export type ChallengeDecision = 'pending' | 'accepted' | 'declined' | 'info_requested';

export interface ProjectMember {
  id: string;
  name: string;
  role: 'mentor' | 'student';
  department: string;
  email: string;
}

export interface UniversityChallenge {
  id: string;
  title: string;
  summary: string;
  domain: string;
  priority: ChallengePriority;
  department: string;
  organization: string;
  feasibilityNotes: string[];
  decision: ChallengeDecision;
  version: number;
  members: ProjectMember[];
  proposal?: {
    approach: string;
    timeline: string;
    mentorId: string;
    studentIds: string[];
  };
  projectId?: string;
  createdAt: string;
}

export type CollaborationType = 'mentorship' | 'funding' | 'prototyping' | 'deployment' | 'technology_transfer';
export type CollaborationRequestStatus = 'pending' | 'accepted' | 'declined';

export interface CollaborationRequest {
  id: string;
  projectId: string;
  projectTitle: string;
  organization: string;
  collaborationType: CollaborationType;
  message: string;
  status: CollaborationRequestStatus;
  version: number;
  createdAt: string;
}

export interface IndustryProject {
  id: string;
  title: string;
  summary: string;
  domain: string;
  university: string;
  department: string;
  milestone: string;
  status: 'open' | 'in_progress' | 'pilot_ready';
  needs: CollaborationType[];
  members: ProjectMember[];
  accessGrantedTo: string[];
}

export type MilestoneStatus = 'completed' | 'current' | 'upcoming' | 'blocked';

export interface ProjectMilestone {
  id: string;
  title: string;
  description: string;
  status: MilestoneStatus;
  dueDate: string;
  owner: string;
}

export interface ProjectRecord {
  id: string;
  title: string;
  detail: string;
  author: string;
  createdAt: string;
}

export interface ProjectBoard {
  id: string;
  title: string;
  summary: string;
  version: number;
  currentStage?: ProjectStage;
  closureStatus?: 'open' | 'closed';
  milestones: ProjectMilestone[];
  deliverables: ProjectRecord[];
  ipDisclosures: ProjectRecord[];
  testRecords: ProjectRecord[];
  outcome?: ProjectOutcome;
  updatedAt: string;
}

export type NotificationType = 'project' | 'submission' | 'system';

export interface CivicNotification {
  id: string;
  type: NotificationType;
  eventType: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface InstitutionMember {
  id: string;
  name: string;
  email: string;
  role: 'staff' | 'mentor' | 'student';
  status: 'active' | 'suspended';
}

export type AdminAccountStatus = 'pending' | 'active' | 'suspended';
export type ModerationStatus = 'open' | 'resolved' | 'dismissed';

export interface AdminInstitution {
  id: string;
  name: string;
  type: 'university' | 'industry';
  accountStatus: AdminAccountStatus;
  createdAt: string;
  users: number;
}

export interface AdminModerationItem {
  id: string;
  title: string;
  reason: string;
  reporter: string;
  status: ModerationStatus;
  createdAt: string;
}

export interface AdminAuditEvent {
  id: string;
  action: string;
  actor: string;
  target: string;
  createdAt: string;
}

export interface AdminReportRow {
  id: string;
  domain: string;
  district: string;
  status: string;
  count: number;
}

export type RoutingAssignmentStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';
export type AssignmentDecision = 'accepted' | 'declined' | 'info_requested';
export type ProjectStage = 'proposed' | 'funded' | 'prototyping' | 'piloted' | 'deployed';
export type ProjectMembershipRole = 'lead' | 'mentor' | 'student' | 'industry_partner';
export type ProposalStatus = 'draft' | 'submitted' | 'approved' | 'returned';
export type EvidenceStatus = 'pending' | 'approved' | 'rejected';
export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

export interface UniversityAssignmentReport {
  id: string;
  title: string;
  description: string;
  domain: string;
  location: string;
  status: SubmissionStatus;
  disposition?: SubmissionDisposition;
  duplicateOf?: string;
  analysis?: SubmissionAnalysis;
  createdAt: string;
}

export interface SubmissionTimelineEvent {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

export interface InformationRequest {
  requestId: string;
  submissionId: string;
  question: string;
  status: 'open' | 'answered' | 'cancelled';
  requestedAt: string;
  answer?: string;
  answeredAt?: string;
}

export interface SubmissionDetail extends Submission {
  timeline: SubmissionTimelineEvent[];
  informationRequests: InformationRequest[];
  outcome?: PublicProjectOutcome;
}

export interface PublicProjectOutcome {
  baseline: string;
  target?: string;
  result: string;
  unit: string;
  measurementStart?: string;
  measurementEnd?: string;
  method?: string;
  beneficiaries?: string;
  validationNote?: string;
  validatedAt?: string;
  evidenceCount: number;
}

export interface UniversityAssignment {
  id: string;
  submissionId: string;
  institutionId: string;
  departmentId: string;
  departmentName: string;
  status: RoutingAssignmentStatus;
  version: number;
  isActive: boolean;
  reason?: string;
  clarification?: { question: string; requestedAt: string };
  matchSnapshot: { score: number; components: Array<{ name: string; points: number; maximum: number; reasons: string[] }>; generatedAt: string };
  assignedBy: string;
  decidedBy?: string;
  decisionReason?: string;
  decidedAt?: string;
  createdAt: string;
  updatedAt: string;
  report?: UniversityAssignmentReport;
}

export interface AssignmentDecisionInput {
  decision: AssignmentDecision;
  expectedVersion: number;
  reason?: string;
  question?: string;
}

export interface AssignmentDecisionResult {
  assignment: UniversityAssignment;
  project?: { id: string; title: string; currentStage: ProjectStage; version: number };
  reused: boolean;
}

export interface AuthorizedProjectSummary {
  id: string;
  title: string;
  summary: string;
  domain: string;
  department: string;
  currentStage: ProjectStage;
  version: number;
  updatedAt: string;
}

export interface InstitutionProfile {
  id: string;
  name: string;
  type: 'university' | 'industry';
  accountStatus: AdminAccountStatus;
  description?: string;
  domains: string[];
  expertise: string[];
  facilities: string[];
  serviceAreas: string[];
  departments: Array<{ id: string; name: string; domains: string[]; leadUserId?: string; active: boolean }>;
  maxActiveProjects: number;
  acceptingWork: boolean;
  profileStatus: 'draft' | 'verified';
  profileVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type InstitutionMembershipRole = 'coordinator' | 'mentor' | 'student' | 'partner';
export type InstitutionMembershipStatus = 'pending' | 'active' | 'suspended';
export interface InstitutionRosterMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  accountStatus: AdminAccountStatus;
  role: InstitutionMembershipRole;
  department?: string;
  status: InstitutionMembershipStatus;
  verifiedAt?: string;
  createdAt: string;
}

export interface InstitutionRosterMutationResult {
  id: string;
  userId: string;
  role: InstitutionMembershipRole;
  department?: string;
  status: InstitutionMembershipStatus;
  verifiedAt?: string;
}

export interface ProjectMembership {
  id: string;
  projectId: string;
  userId: string;
  name?: string;
  email?: string;
  role: ProjectMembershipRole;
  status: 'active' | 'suspended';
  department?: string;
  addedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalInput {
  approach: string;
  timeline: string;
  beneficiaries: string;
  rootCause: string;
  workPlan: string;
  risks: string;
  resources: string;
  budgetMinor?: number;
  currency?: string;
}

export interface ProposalRevision extends ProposalInput {
  id: string;
  proposalId: string;
  projectId: string;
  revision: number;
  status: ProposalStatus;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  reviews: ProposalReview[];
}

export interface ProposalReview {
  reviewId: string;
  proposalId: string;
  projectId: string;
  status: 'approved' | 'returned';
  note: string;
  reviewedBy: string;
  createdAt: string;
}

export interface IndustryOpportunity {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  needs: CollaborationType[];
  status: 'published' | 'closed';
  university: string;
  projectTitle: string;
  domain?: string;
  department?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportOffer {
  id: string;
  opportunityId: string;
  projectId: string;
  organization: string;
  supportType: CollaborationType;
  responsibilities: string;
  message: string;
  amountMinor?: number;
  currency?: string;
  inKindDescription?: string;
  status: OfferStatus;
  version: number;
  projectTitle: string;
  opportunityTitle: string;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneEvidence {
  evidenceId: string;
  projectId: string;
  targetStage: ProjectStage;
  revision: number;
  note: string;
  links: string[];
  submittedBy: string;
  status: EvidenceStatus;
  submittedAt: string;
  updatedAt: string;
}

export interface MilestoneReview {
  reviewId: string;
  evidenceId: string;
  projectId: string;
  targetStage: ProjectStage;
  status: 'approved' | 'rejected';
  note: string;
  reviewedBy: string;
  reviewedAt: string;
  consumedAt?: string;
}

export interface ProjectOutcome {
  baseline: string;
  target?: string;
  result: string;
  unit: string;
  measurementStart?: string;
  measurementEnd?: string;
  method?: string;
  beneficiaries?: string;
  evidence: string[];
  validationNote?: string;
  validatedBy?: string;
  validatedAt?: string;
}

export interface ProjectClosure {
  closureId: string;
  projectId: string;
  submissionId: string;
  action: 'closed' | 'reopened';
  reason?: string;
  outcome?: ProjectOutcome;
  actorId: string;
  createdAt: string;
}

export interface AnalyticsReport {
  generatedAt: string;
  filters: { domain?: string; district?: string; institutionId?: string; from?: string; to?: string };
  submissions: { total: number; distinct: number; duplicateLinked: number; resolved: number; byStatus: Record<string, number>; byDisposition: Record<string, number> };
  projects: { total: number; active: number; closed: number; closureRate: { numerator: number; denominator: number; percent: number } };
  stageFunnel: Array<{ stage: ProjectStage; projects: number }>;
  domains: Array<{ domain: string; submitted: number; inProgress: number; resolved: number; total: number }>;
  districts: Array<{ district: string; total: number; activeProjects: number; resolved: number; engagedInstitutions: number }>;
  engagedInstitutions: { count: number; ids: string[] };
  universities: Array<{ id: string; name: string; challengesAssigned: number; projectsActive: number; proposalsSubmitted: number; solutionsDeployed: number }>;
  industry: Array<{ id: string; name: string; acceptedOffers: number; confirmedCashByCurrency: Record<string, number>; prototypeOffers: number; deploymentOffers: number }>;
  cashCommitments: Array<{ currency: string; pledgedMinor: number; confirmedMinor: number; deliveredMinor: number }>;
  verifiedOutcomes: { patents: number; startups: number; source: 'explicit_records_only' };
}

export interface AdminSubmissionDetail {
  submission: Submission & { _id?: string; disposition?: 'active' | 'duplicate' | 'rejected' | 'referred'; duplicateOf?: string };
  moderation: Array<Record<string, unknown>>;
  informationRequests: Array<Record<string, unknown>>;
  timeline: Array<Record<string, unknown>>;
  routing: UniversityAssignment[];
}

export type AdminReviewDecision = 'reviewed' | 'information_requested' | 'marked_duplicate' | 'rejected' | 'referred' | 'restored';
export interface AdminReviewInput {
  decision?: AdminReviewDecision;
  note?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  duplicateOf?: string;
  question?: string;
}

export interface AdminReviewResult {
  id: string;
  status: SubmissionStatus;
  disposition: 'active' | 'duplicate' | 'rejected' | 'referred';
  decision: AdminReviewDecision;
  moderationId: string;
  informationRequestId?: string;
}

export interface UniversityRecommendation {
  institutionId: string;
  institutionName: string;
  departments: Array<{ id: string; name: string; domains: string[] }>;
  score: number;
  components: Array<{ name: string; points: number; maximum: number; reasons: string[] }>;
  availableCapacity: number;
  activeProjects: number;
  reservedAssignments: number;
}

export interface UniversityRecommendationResult {
  submissionId: string;
  candidates: UniversityRecommendation[];
  noMatch: boolean;
}

export class ApiError extends Error {
  code: string;
  details?: ErrorDetail[];
  statusCode?: number;
  requestId?: string;

  constructor(payload: ErrorPayload, statusCode?: number, requestId?: string) {
    super(payload.message);
    this.name = 'ApiError';
    this.code = payload.code;
    this.details = payload.details;
    this.statusCode = statusCode;
    this.requestId = requestId;
  }
}

/* ── Government Dashboard Types ── */

export interface GovKpiCard {
  id: string;
  label: string;
  value: number;
  change: number; // percentage change from last period
  icon: string;
}

export interface GovDomainStat {
  id: string;
  domain: string;
  submitted: number;
  inProgress: number;
  resolved: number;
  color: string;
}

export interface GovDistrictStat {
  id: string;
  district: string;
  totalChallenges: number;
  activeProjects: number;
  resolved: number;
  universitiesEngaged: number;
  industryPartners: number;
}

export interface GovUniversityPerformance {
  id: string;
  name: string;
  challengesAssigned: number;
  projectsActive: number;
  proposalsSubmitted: number;
  solutionsDeployed: number;
  patents: number;
  startupsIncubated: number;
}

export interface GovIndustryEngagement {
  id: string;
  name: string;
  type: 'large' | 'startup' | 'msme' | 'csr' | 'unclassified';
  fundingLakhs: number;
  mentorshipHours: number;
  prototypes: number;
  deployments: number;
  sector: string;
}

export type GovProjectStage = 'submitted' | 'under_review' | 'in_progress' | 'pilot' | 'deployed';

export interface GovProjectTimeline {
  id: string;
  title: string;
  university: string;
  industry: string;
  domain: string;
  district: string;
  stage: GovProjectStage;
  startDate: string;
  lastUpdated: string;
}

export interface GovTrendPoint {
  month: string;
  submitted: number;
  resolved: number;
}

export interface GovChallengeRow {
  id: string;
  title: string;
  domain: string;
  district: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  university: string;
  submittedAt: string;
}

export interface GovActivityEvent {
  id: string;
  message: string;
  type: 'challenge' | 'project' | 'collaboration' | 'milestone';
  timestamp: string;
}

