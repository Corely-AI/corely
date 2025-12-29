import { z } from "zod";
import { ProvenanceSchema } from "../crm/ai-proposals/party-proposal.types";

export const DuplicateRiskItemSchema = z.object({
  vendorBillId: z.string(),
  billNumber: z.string().optional(),
  supplierName: z.string().optional(),
  billDate: z.string().optional(),
  totalCents: z.number().int().optional(),
  matchScore: z.number().min(0).max(1),
  reasons: z.array(z.string()).optional(),
});

export const DuplicateRiskCardSchema = z.object({
  ok: z.literal(true),
  possibleDuplicates: z.array(DuplicateRiskItemSchema),
  recommendation: z.string().optional(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type DuplicateRiskCard = z.infer<typeof DuplicateRiskCardSchema>;
