import { afterEach, describe, expect, it, vi } from 'vitest'
import { request } from '../src/api/client'
import { createIndustrySupportOffer, decideUniversityOffer, listIndustryOffers, listIndustryOpportunities, publishUniversityOpportunity } from '../src/api/industry.api'
import { addProjectMember, addProjectRecord, advanceProjectStage, listAuthorizedProjects, listMilestoneEvidence, listMilestoneReviews, submitProjectProposal } from '../src/api/projects.api'
import { decideUniversityAssignment, listUniversityAssignments } from '../src/api/university.api'
import { createVoiceReportDraft, getSubmissionDetail, replyToInformationRequest } from '../src/api/submissions.api'
import { closeProject, getUniversityRecommendations, listProjectClosures, reopenProject, reviewAdminSubmission, reviewProjectProposal, routeSubmission } from '../src/api/admin.api'
import { ApiError } from '../src/api/types'
import { getUnreadNotificationCount, listNotifications, markAllNotificationsRead, markNotificationRead } from '../src/api/notifications.api'

vi.mock('../src/api/client', () => ({ request: vi.fn() }))

describe('institutional client contracts', () => {
  afterEach(() => vi.mocked(request).mockReset())

  it('strips UI-only author fields before sending a project record', async () => {
    vi.mocked(request).mockResolvedValueOnce({ success: true, data: {} } as never)

    await addProjectRecord('project-001', 'deliverables', {
      title: 'Prototype',
      detail: 'Initial prototype completed.',
      author: 'UI-only label',
    }, 3)

    expect(vi.mocked(request)).toHaveBeenCalledWith('/projects/project-001/deliverables', {
      method: 'POST',
      data: { title: 'Prototype', detail: 'Initial prototype completed.', expectedVersion: 3 },
    })
  })

  it('sends only the strict support-offer fields', async () => {
    vi.mocked(request).mockResolvedValueOnce({ success: true, data: {} } as never)

    await createIndustrySupportOffer('opportunity-001', {
      supportType: 'prototyping',
      responsibilities: 'Provide fabrication support and testing time.',
      message: 'We can support the prototype build.',
      organization: 'UI-only label',
      projectTitle: 'UI-only label',
    } as never)

    expect(vi.mocked(request)).toHaveBeenCalledWith('/industry/opportunities/opportunity-001/offers', {
      method: 'POST',
      data: {
        supportType: 'prototyping',
        responsibilities: 'Provide fabrication support and testing time.',
        message: 'We can support the prototype build.',
      },
    })
  })

  it('uses the published opportunity and university offer contracts', async () => {
    vi.mocked(request).mockResolvedValueOnce({ success: true, data: [] } as never)
    await listIndustryOpportunities()
    expect(vi.mocked(request)).toHaveBeenCalledWith('/industry/opportunities')

    vi.mocked(request).mockResolvedValueOnce({ success: true, data: [] } as never)
    await listIndustryOffers()
    expect(vi.mocked(request)).toHaveBeenCalledWith('/industry/offers')

    vi.mocked(request).mockResolvedValueOnce({ success: true, data: {} } as never)
    await publishUniversityOpportunity({ projectId: 'project-001', title: 'Clean water pilot', summary: 'A measured pilot for reliable neighborhood water monitoring.', needs: ['funding'] })
    expect(vi.mocked(request)).toHaveBeenCalledWith('/university/opportunities', { method: 'POST', data: { projectId: 'project-001', title: 'Clean water pilot', summary: 'A measured pilot for reliable neighborhood water monitoring.', needs: ['funding'] } })

    vi.mocked(request).mockResolvedValueOnce({ success: true, data: {} } as never)
    await createIndustrySupportOffer('opportunity-001', { supportType: 'funding', responsibilities: 'Provide funds and monthly reporting for the pilot.', message: 'Our team can fund the first pilot phase.', amountMinor: 250000, currency: 'INR' })
    expect(vi.mocked(request)).toHaveBeenCalledWith('/industry/opportunities/opportunity-001/offers', { method: 'POST', data: { supportType: 'funding', responsibilities: 'Provide funds and monthly reporting for the pilot.', message: 'Our team can fund the first pilot phase.', amountMinor: 250000, currency: 'INR' } })

    vi.mocked(request).mockResolvedValueOnce({ success: true, data: {} } as never)
    await decideUniversityOffer('offer-001', 'accepted', 3)
    expect(vi.mocked(request)).toHaveBeenCalledWith('/university/offers/offer-001/decision', { method: 'POST', data: { status: 'accepted', expectedVersion: 3 } })
  })

  it('marks optimistic assignment conflicts without swallowing the error', async () => {
    vi.mocked(request).mockRejectedValueOnce(new ApiError({ code: 'CONFLICT', message: 'Refresh and retry.' }, 409))

    await expect(decideUniversityAssignment('assignment-001', { decision: 'accepted', expectedVersion: 1 })).rejects.toMatchObject({ name: 'ConflictError', statusCode: 409 })
  })

  it('uses owner-scoped detail and information-reply routes', async () => {
    vi.mocked(request).mockResolvedValueOnce({ success: true, data: { timeline: [], informationRequests: [] } } as never)
    await getSubmissionDetail('submission/001')
    expect(vi.mocked(request)).toHaveBeenCalledWith('/submissions/submission%2F001')

    vi.mocked(request).mockResolvedValueOnce({ success: true, data: { requestId: 'request-001', status: 'answered' } } as never)
    await replyToInformationRequest('submission-001', 'request-001', 'The repair is beside the school gate.')
    expect(vi.mocked(request)).toHaveBeenCalledWith('/submissions/submission-001/information-requests/request-001/reply', { method: 'POST', data: { answer: 'The repair is beside the school gate.' } })
  })

  it('sends a voice recording as a draft-only multipart request', async () => {
    vi.mocked(request).mockResolvedValueOnce({ success: true, data: { transcript: 'A streetlight is broken.', languageCode: 'en-IN', languageName: 'English', title: 'Broken streetlight', description: 'The streetlight near the school is broken and the road is dark.', domain: 'infrastructure' } } as never)
    const audio = new Blob(['voice-bytes'], { type: 'audio/webm' })

    await createVoiceReportDraft(audio)

    expect(vi.mocked(request)).toHaveBeenCalledOnce()
    const [path, options] = vi.mocked(request).mock.calls[0]
    expect(path).toBe('/submissions/voice-draft')
    expect(options?.method).toBe('POST')
    expect(options?.data).toBeInstanceOf(FormData)
    expect((options?.data as FormData).get('audio')).toBeInstanceOf(File)
  })

  it('preserves the recommendation envelope returned by the admin contract', async () => {
    vi.mocked(request).mockResolvedValueOnce({ success: true, data: { submissionId: 'submission-001', candidates: [], noMatch: true } } as never)

    await expect(getUniversityRecommendations('submission-001')).resolves.toEqual({ submissionId: 'submission-001', candidates: [], noMatch: true })
    expect(vi.mocked(request)).toHaveBeenCalledWith('/admin/university-recommendations/submission-001')
  })

  it('sends strict review and routing payloads', async () => {
    vi.mocked(request).mockResolvedValueOnce({ success: true, data: {} } as never)
    await reviewAdminSubmission('submission-001', { decision: 'information_requested', question: 'Which lane is affected?', note: 'Confirm the exact location.' })
    expect(vi.mocked(request)).toHaveBeenCalledWith('/admin/submissions/submission-001/review', { method: 'POST', data: { decision: 'information_requested', question: 'Which lane is affected?', note: 'Confirm the exact location.' } })

    vi.mocked(request).mockResolvedValueOnce({ success: true, data: {} } as never)
    await routeSubmission('submission-001', { institutionId: 'institution-001', departmentId: 'civil', reason: 'Strong infrastructure match.' })
    expect(vi.mocked(request)).toHaveBeenCalledWith('/admin/submissions/submission-001/route', { method: 'POST', data: { institutionId: 'institution-001', departmentId: 'civil', reason: 'Strong infrastructure match.' } })
  })

  it('uses the assignment inbox route and keeps the optimistic version field', async () => {
    vi.mocked(request).mockResolvedValueOnce({ success: true, data: [] } as never)
    await listUniversityAssignments()
    expect(vi.mocked(request)).toHaveBeenCalledWith('/university/assignments')

    vi.mocked(request).mockResolvedValueOnce({ success: true, data: {} } as never)
    await decideUniversityAssignment('assignment-001', { decision: 'declined', expectedVersion: 4, reason: 'No current capacity.' })
    expect(vi.mocked(request)).toHaveBeenCalledWith('/university/assignments/assignment-001/decision', { method: 'POST', data: { decision: 'declined', expectedVersion: 4, reason: 'No current capacity.' } })
  })

  it('uses authorized project, team, proposal, and admin-review contracts', async () => {
    vi.mocked(request).mockResolvedValueOnce({ success: true, data: [] } as never)
    await listAuthorizedProjects()
    expect(vi.mocked(request)).toHaveBeenCalledWith('/projects')

    vi.mocked(request).mockResolvedValueOnce({ success: true, data: {} } as never)
    await addProjectMember('project-001', { userId: '507f1f77bcf86cd799439011', role: 'student', expectedVersion: 2 })
    expect(vi.mocked(request)).toHaveBeenCalledWith('/projects/project-001/members', { method: 'POST', data: { userId: '507f1f77bcf86cd799439011', role: 'student', expectedVersion: 2 } })

    vi.mocked(request).mockResolvedValueOnce({ success: true, data: {} } as never)
    await submitProjectProposal('project-001', { approach: 'A practical approach with a measured pilot.', timeline: '12 weeks', beneficiaries: 'Residents in the affected district.', rootCause: 'The current service has no reliable monitoring.', workPlan: 'Research, prototype, test, and hand over the solution.', risks: 'Adoption risk will be managed through weekly reviews.', resources: 'University lab, mentor hours, and field access.' })
    expect(vi.mocked(request)).toHaveBeenCalledWith('/projects/project-001/proposals', { method: 'POST', data: { approach: 'A practical approach with a measured pilot.', timeline: '12 weeks', beneficiaries: 'Residents in the affected district.', rootCause: 'The current service has no reliable monitoring.', workPlan: 'Research, prototype, test, and hand over the solution.', risks: 'Adoption risk will be managed through weekly reviews.', resources: 'University lab, mentor hours, and field access.' } })

    vi.mocked(request).mockResolvedValueOnce({ success: true, data: {} } as never)
    await reviewProjectProposal('project-001', 'proposal-001', { status: 'returned', note: 'Add measurable pilot outcomes.' })
    expect(vi.mocked(request)).toHaveBeenCalledWith('/projects/project-001/proposals/proposal-001/review', { method: 'POST', data: { status: 'returned', note: 'Add measurable pilot outcomes.' } })
  })

  it('uses immutable milestone history and separate advance contracts', async () => {
    vi.mocked(request).mockResolvedValueOnce({ success: true, data: [] } as never)
    await listMilestoneEvidence('project-001')
    expect(vi.mocked(request)).toHaveBeenCalledWith('/projects/project-001/milestone-evidence')

    vi.mocked(request).mockResolvedValueOnce({ success: true, data: [] } as never)
    await listMilestoneReviews('project-001')
    expect(vi.mocked(request)).toHaveBeenCalledWith('/projects/project-001/milestone-reviews')

    vi.mocked(request).mockResolvedValueOnce({ success: true, data: {} } as never)
    await advanceProjectStage('project-001', 'funded', 'review-001', 8)
    expect(vi.mocked(request)).toHaveBeenCalledWith('/projects/project-001/milestones/funded/advance', { method: 'POST', data: { approvedReviewId: 'review-001', expectedVersion: 8 } })
  })

  it('uses outcome validation and closure history contracts', async () => {
    vi.mocked(request).mockResolvedValueOnce({ success: true, data: [] } as never)
    await listProjectClosures('project-001')
    expect(vi.mocked(request)).toHaveBeenCalledWith('/admin/projects/project-001/closures')

    vi.mocked(request).mockResolvedValueOnce({ success: true, data: {} } as never)
    await closeProject('project-001', { baseline: '10', target: '5', result: '6', unit: 'ppm', measurementStart: '2026-09-01', measurementEnd: '2026-09-10', method: 'Field readings', beneficiaries: 'Ward residents', evidence: ['https://example.test/outcome.pdf'], validationNote: 'Reviewed by the administrator.', expectedVersion: 4 })
    expect(vi.mocked(request)).toHaveBeenCalledWith('/admin/projects/project-001/close', { method: 'POST', data: { baseline: '10', target: '5', result: '6', unit: 'ppm', measurementStart: '2026-09-01', measurementEnd: '2026-09-10', method: 'Field readings', beneficiaries: 'Ward residents', evidence: ['https://example.test/outcome.pdf'], validationNote: 'Reviewed by the administrator.', expectedVersion: 4 } })

    vi.mocked(request).mockResolvedValueOnce({ success: true, data: {} } as never)
    await reopenProject('project-001', { reason: 'The follow-up measurement needs a corrective cycle.', expectedVersion: 5 })
    expect(vi.mocked(request)).toHaveBeenCalledWith('/admin/projects/project-001/reopen', { method: 'POST', data: { reason: 'The follow-up measurement needs a corrective cycle.', expectedVersion: 5 } })
  })

  it('uses recipient-scoped notification inbox and read contracts', async () => {
    vi.mocked(request).mockResolvedValueOnce({ success: true, data: [] } as never)
    await listNotifications()
    expect(vi.mocked(request)).toHaveBeenCalledWith('/notifications')

    vi.mocked(request).mockResolvedValueOnce({ success: true, data: { count: 2 } } as never)
    await expect(getUnreadNotificationCount()).resolves.toBe(2)
    expect(vi.mocked(request)).toHaveBeenCalledWith('/notifications/unread-count')

    vi.mocked(request).mockResolvedValueOnce({ success: true, data: {} } as never)
    await markNotificationRead('notification-001')
    expect(vi.mocked(request)).toHaveBeenCalledWith('/notifications/notification-001/read', { method: 'POST' })

    vi.mocked(request).mockResolvedValueOnce({ success: true, data: {} } as never)
    await markAllNotificationsRead()
    expect(vi.mocked(request)).toHaveBeenCalledWith('/notifications/read-all', { method: 'POST' })
  })
})
