import { request } from './client';
import type { Submission, SubmissionAttachment, SubmissionAnalysis } from './types';

export interface CreateSubmissionInput {
  title: string;
  description: string;
  domain: string;
  location: string;
  submitterType: Submission['submitterType'];
  attachments: SubmissionAttachment[];
  files?: File[];
  idempotencyKey: string;
}

export async function createSubmission(input: CreateSubmissionInput): Promise<Submission> {
  const formData = new FormData();
  formData.append('title', input.title);
  formData.append('description', input.description);
  formData.append('domain', input.domain);
  formData.append('location', input.location);
  formData.append('submitterType', input.submitterType);
  formData.append('idempotencyKey', input.idempotencyKey);
  for (const file of input.files ?? []) formData.append('attachments', file);
  return (await request<Submission>('/submissions', { method: 'POST', data: formData })).data;
}

export async function classifySubmission(input: Pick<CreateSubmissionInput, 'title' | 'description' | 'domain'>): Promise<SubmissionAnalysis> {
  return (await request<SubmissionAnalysis>('/submissions/classify', { method: 'POST', data: input })).data;
}

export async function listSubmissions(): Promise<Submission[]> {
  return (await request<Submission[]>('/submissions')).data;
}

export async function addSubmissionComment(id: string, text: string) {
  return (await request<{ id: string; text: string }>(`/submissions/${id}/comments`, { method: 'POST', data: { text } })).data;
}
