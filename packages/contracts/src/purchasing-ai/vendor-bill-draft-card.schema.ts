import { z } from "zod";
import { ProvenanceSchema } from "../crm/ai-proposals/party-proposal.types";

export const VendorBillDraftLineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitCostCents: z.number().int().nonnegative(),
  category: z.string().optional(),
  glAccountId: z.string().optional(),
  taxCode: z.string().optional(),
});

export const VendorBillDraftProposalSchema = z.object({
  supplierPartyId: z.string().optional(),
  supplierName: z.string().optional(),
  supplierContactPartyId: z.string().optional(),
  billNumber: z.string().optional(),
  billDate: z.string().optional(),
  dueDate: z.string().optional(),
  currency: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(VendorBillDraftLineItemSchema),
  missingFields: z.array(z.string()).optional(),
  followUpQuestions: z.array(z.string()).optional(),
  duplicateRisk: z
    .object({
      possibleDuplicateOfBillId: z.string().optional(),
      duplicateScore: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

export const VendorBillDraftProposalCardSchema = z.object({
  ok: z.literal(true),
  proposal: VendorBillDraftProposalSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type VendorBillDraftProposalCard = z.infer<typeof VendorBillDraftProposalCardSchema>;
