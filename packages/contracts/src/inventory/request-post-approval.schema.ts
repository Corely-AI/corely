import { z } from "zod";
import { localDateSchema } from "../shared/local-date.schema";

export const RequestInventoryPostApprovalInputSchema = z.object({
  documentId: z.string(),
  postingDate: localDateSchema.optional(),
  idempotencyKey: z.string().optional(),
});

export const InventoryPostApprovalStatusSchema = z.enum(["APPROVED", "PENDING", "REJECTED"]);

export const RequestInventoryPostApprovalOutputSchema = z.object({
  status: InventoryPostApprovalStatusSchema,
  reason: z.string().optional(),
  instanceId: z.string().optional(),
  policyId: z.string().optional(),
});

export type RequestInventoryPostApprovalInput = z.infer<
  typeof RequestInventoryPostApprovalInputSchema
>;
export type RequestInventoryPostApprovalOutput = z.infer<
  typeof RequestInventoryPostApprovalOutputSchema
>;
