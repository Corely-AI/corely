import { z } from "zod";
import { ProvenanceSchema } from "../crm/ai-proposals/party-proposal.types";

export const PurchaseOrderDraftLineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitCostCents: z.number().int().nonnegative(),
  category: z.string().optional(),
  taxCode: z.string().optional(),
});

export const PurchaseOrderDraftProposalSchema = z.object({
  supplierPartyId: z.string().optional(),
  supplierName: z.string().optional(),
  supplierContactPartyId: z.string().optional(),
  orderDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(PurchaseOrderDraftLineItemSchema),
  missingFields: z.array(z.string()).optional(),
  followUpQuestions: z.array(z.string()).optional(),
});

export const PurchaseOrderDraftProposalCardSchema = z.object({
  ok: z.literal(true),
  proposal: PurchaseOrderDraftProposalSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type PurchaseOrderDraftProposalCard = z.infer<typeof PurchaseOrderDraftProposalCardSchema>;
