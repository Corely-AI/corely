import { z } from "zod";

export const ServiceRequestKindSchema = z.enum(["PROBLEM", "SERVICE"]);
export const ClientUpdateStatusSchema = z.enum(["QUEUED", "SENT", "FAILED", "NEEDS_REVIEW"]);
export const SubmitServiceRequestSchema = z.object({
  kind: ServiceRequestKindSchema,
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().min(1).max(8000),
  clientEmail: z.string().trim().email().max(320).optional(),
  idempotencyKey: z.string().uuid(),
});
export const SendClientUpdateSchema = z.object({
  recipient: z.string().trim().email().max(320),
  summary: z.string().trim().min(1).max(8000),
});
export type SubmitServiceRequest = z.infer<typeof SubmitServiceRequestSchema>;
export type SendClientUpdate = z.infer<typeof SendClientUpdateSchema>;
