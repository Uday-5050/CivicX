/**
 * Lifecycle statuses and categories matching docs/openapi.yaml
 */
export const ISSUE_STATUS = {
  DRAFT: 'draft',
  OPEN: 'open',
  UNDER_REVIEW: 'under_review',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  REJECTED: 'rejected',
} as const;

export type IssueStatus = typeof ISSUE_STATUS[keyof typeof ISSUE_STATUS];

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  [ISSUE_STATUS.DRAFT]: 'Draft',
  [ISSUE_STATUS.OPEN]: 'Open',
  [ISSUE_STATUS.UNDER_REVIEW]: 'Under Review',
  [ISSUE_STATUS.IN_PROGRESS]: 'In Progress',
  [ISSUE_STATUS.RESOLVED]: 'Resolved',
  [ISSUE_STATUS.CLOSED]: 'Closed',
  [ISSUE_STATUS.REJECTED]: 'Rejected',
};

export const ISSUE_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type IssuePriority = typeof ISSUE_PRIORITY[keyof typeof ISSUE_PRIORITY];

export const ISSUE_CATEGORY = {
  INFRASTRUCTURE: 'infrastructure',
  SAFETY: 'safety',
  ENVIRONMENT: 'environment',
  TRANSPORTATION: 'transportation',
  COMMUNITY: 'community',
  EDUCATION: 'education',
  HEALTH: 'health',
  GOVERNANCE: 'governance',
  OTHER: 'other',
} as const;

export type IssueCategory = typeof ISSUE_CATEGORY[keyof typeof ISSUE_CATEGORY];
