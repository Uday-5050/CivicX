import { z } from "zod";

const text = z.string().trim().min(1).max(2000);
const attachmentSchema = z.object({
  id: z.string().trim().min(1).max(300),
  name: z.string().trim().min(1).max(255),
  type: z.string().trim().max(150),
  size: z.number().int().min(0).max(100 * 1024 * 1024),
  previewUrl: z.string().max(2000).optional(),
}).strict();

export const createSubmissionSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(20).max(2000),
  domain: z.string().trim().min(1).max(120),
  location: z.string().trim().min(1).max(300),
  submitterType: z.enum(["citizen", "university", "industry", "admin"]).optional(),
  attachments: z.array(attachmentSchema).max(5),
  idempotencyKey: z.string().trim().min(1).max(100),
}).strict();

export const classifySubmissionSchema = createSubmissionSchema.pick({ title: true, description: true, domain: true });
export const commentSchema = z.object({ text: text.max(1000) }).strict();
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
