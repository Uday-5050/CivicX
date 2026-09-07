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

export type AnalysisStatus = 'pending' | 'completed' | 'failed';
export type SubmissionStatus = 'draft' | 'submitted' | 'under_review' | 'resolved';

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
  milestones: ProjectMilestone[];
  deliverables: ProjectRecord[];
  ipDisclosures: ProjectRecord[];
  testRecords: ProjectRecord[];
  updatedAt: string;
}

export type NotificationType = 'project' | 'submission' | 'system';

export interface CivicNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface InstitutionMember {
  id: string;
  name: string;
  email: string;
  role: 'staff' | 'mentor' | 'student';
  status: 'active' | 'suspended';
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
