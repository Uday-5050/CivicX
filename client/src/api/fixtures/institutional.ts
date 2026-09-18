import type { SuccessResponse, SupportOffer, UniversityAssignment } from '../types'

const timestamp = '2026-09-18T10:00:00.000Z'

export const mockUniversityAssignments: SuccessResponse<UniversityAssignment[]> = {
  success: true,
  data: [{
    id: 'assignment-001',
    submissionId: 'submission-001',
    institutionId: 'university-001',
    departmentId: 'department-001',
    departmentName: 'Civil Engineering',
    status: 'pending',
    version: 1,
    isActive: true,
    matchSnapshot: { score: 86, components: [], generatedAt: timestamp },
    assignedBy: 'admin-001',
    createdAt: timestamp,
    updatedAt: timestamp,
    report: {
      id: 'submission-001',
      title: 'Broken footbridge',
      description: 'A footbridge needs repair.',
      domain: 'infrastructure',
      location: 'Ward 4',
      status: 'assigned',
      createdAt: timestamp,
    },
  }],
  meta: { requestId: 'request-001', timestamp },
}

export const mockSupportOffers: SuccessResponse<SupportOffer[]> = {
  success: true,
  data: [{
    id: 'offer-001',
    opportunityId: 'opportunity-001',
    projectId: 'project-001',
    organization: 'Civic Works Ltd',
    supportType: 'prototyping',
    responsibilities: 'Provide fabrication support and testing time.',
    message: 'We can support the prototype build.',
    status: 'pending',
    version: 1,
    projectTitle: 'Footbridge repair',
    opportunityTitle: 'Prototype partner needed',
    createdAt: timestamp,
    updatedAt: timestamp,
  }],
  meta: { requestId: 'request-002', timestamp },
}
