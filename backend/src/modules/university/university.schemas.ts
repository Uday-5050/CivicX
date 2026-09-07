import { z } from "zod";
const text = z.string().trim().min(1).max(500);
export const proposalSchema = z.object({
  approach: z.string().trim().min(1).max(10000),
  timeline: z.enum(["4 weeks", "8 weeks", "12 weeks"]),
  mentorId: text,
  studentIds: z.array(text).min(1).max(100).refine(ids => new Set(ids).size === ids.length, "Duplicate students are not allowed"),
}).strict();
export const decisionSchema = z.object({
  decision: z.enum(["accepted", "declined", "info_requested"]),
  version: z.number().int().min(1),
  proposal: proposalSchema.optional(),
}).strict().superRefine((value, ctx) => {
  if ((value.decision === "accepted") !== Boolean(value.proposal)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["proposal"], message: "A proposal is required only for acceptance" });
  }
});
export const createChallengeSchema = z.object({
  institutionId: z.string().regex(/^[a-f\d]{24}$/i),
  title: text, summary: z.string().trim().min(1).max(10000), domain: text,
  priority: z.enum(["low", "medium", "high"]), department: text, organization: text,
  feasibilityNotes: z.array(text).max(50),
  members: z.array(z.object({ id: text, name: text, role: z.enum(["mentor", "student"]), department: text, email: z.string().trim().email().max(254) }).strict()).max(200)
    .refine(members => new Set(members.map(member => member.id)).size === members.length, "Member IDs must be unique"),
}).strict();
export type Proposal = z.infer<typeof proposalSchema>;
export type ChallengeInput = z.infer<typeof createChallengeSchema>;
