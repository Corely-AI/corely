import { z } from "zod";
import { ProvenanceSchema } from "../crm/ai-proposals/party-proposal.types";

export const ExpenseChangeHighlightSchema = z.object({
  description: z.string(),
  amountChangeCents: z.number().int().optional(),
  supplierPartyId: z.string().optional(),
  vendorBillId: z.string().optional(),
  journalEntryId: z.string().optional(),
});

export const ExpenseChangesNarrativeCardSchema = z.object({
  ok: z.literal(true),
  narrative: z.string(),
  highlights: z.array(ExpenseChangeHighlightSchema).optional(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type ExpenseChangesNarrativeCard = z.infer<typeof ExpenseChangesNarrativeCardSchema>;
