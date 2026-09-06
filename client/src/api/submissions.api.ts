import { request } from './client';
import type { Submission, SubmissionAttachment, SubmissionAnalysis } from './types';

export interface CreateSubmissionInput {
  title: string;
  description: string;
  domain: string;
  location: string;
  submitterType: Submission['submitterType'];
  attachments: SubmissionAttachment[];
  idempotencyKey: string;
}

const demoSubmissions: Submission[] = [
  {
    id: 'sub_demo_001',
    idempotencyKey: 'demo-road-lighting',
    title: 'Street lights are not working near the community centre',
    description: 'The road is dark after 7pm and students are finding it difficult to travel safely.',
    domain: 'Public safety',
    location: 'Ranchi, Jharkhand',
    submitterType: 'citizen',
    attachments: [],
    status: 'under_review',
    analysis: { status: 'completed', category: 'Infrastructure', priority: 'high', summary: 'Likely public lighting maintenance issue.' },
    comments: 8,
    upvotes: 24,
    hasUpvoted: false,
    createdAt: '2026-09-05T09:30:00.000Z',
  },
  {
    id: 'sub_demo_002',
    idempotencyKey: 'demo-waste-collection',
    title: 'Weekly waste collection needed in Ward 12',
    description: 'Households have requested a predictable collection schedule for the last two weeks.',
    domain: 'Sanitation',
    location: 'Jamshedpur, Jharkhand',
    submitterType: 'citizen',
    attachments: [],
    status: 'submitted',
    analysis: { status: 'completed', category: 'Waste management', priority: 'medium', summary: 'Collection schedule request.' },
    comments: 3,
    upvotes: 11,
    hasUpvoted: false,
    createdAt: '2026-09-04T14:10:00.000Z',
  },
];

export async function createSubmission(input: CreateSubmissionInput): Promise<Submission> {
  try {
    return (await request<Submission>('/submissions', { method: 'POST', data: input })).data;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const existing = demoSubmissions.find((submission) => submission.idempotencyKey === input.idempotencyKey);
    if (existing) return existing;
    const submission: Submission = {
      id: `sub_demo_${Date.now()}`,
      ...input,
      status: 'submitted',
      analysis: { status: 'pending' },
      comments: 0,
      upvotes: 0,
      hasUpvoted: false,
      createdAt: new Date().toISOString(),
    };
    demoSubmissions.unshift(submission);
    return submission;
  }
}

export async function classifySubmission(input: Pick<CreateSubmissionInput, 'title' | 'description' | 'domain'>): Promise<SubmissionAnalysis> {
  try {
    return (await request<SubmissionAnalysis>('/submissions/classify', { method: 'POST', data: input })).data;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 650));
    const lower = `${input.title} ${input.description} ${input.domain}`.toLowerCase();
    if (lower.includes('outage') || lower.includes('failed')) throw new Error('Classification service unavailable.');
    const category = lower.includes('road') || lower.includes('light') ? 'Infrastructure' : lower.includes('waste') || lower.includes('water') ? 'Public services' : 'Community development';
    const priority = lower.includes('unsafe') || lower.includes('urgent') ? 'high' : lower.includes('minor') ? 'low' : 'medium';
    return { status: 'completed', category, priority, summary: `This appears to be a ${category.toLowerCase()} concern.` };
  }
}

export async function listSubmissions(): Promise<Submission[]> {
  try {
    return (await request<Submission[]>('/submissions')).data;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return [...demoSubmissions];
  }
}

export async function addSubmissionComment(id: string, text: string) {
  try { return (await request<{ id: string; text: string }>(`/submissions/${id}/comments`, { method: 'POST', data: { text } })).data; }
  catch { return { id: `comment_${Date.now()}`, text }; }
}