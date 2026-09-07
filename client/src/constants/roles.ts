/**
 * User roles across the platform, matching docs/openapi.yaml
 */
export const ROLES = {
  CITIZEN: 'citizen',
  UNIVERSITY: 'university',
  INDUSTRY: 'industry',
  ADMIN: 'admin',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.CITIZEN]: 'Citizen',
  [ROLES.UNIVERSITY]: 'University / Academic',
  [ROLES.INDUSTRY]: 'Industry Partner',
  [ROLES.ADMIN]: 'State Administrator',
};
