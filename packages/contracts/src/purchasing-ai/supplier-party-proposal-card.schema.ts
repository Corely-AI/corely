import { z } from "zod";
import { PartyRoleTypeSchema, AddressSchema } from "../crm/party.types";
import { ProvenanceSchema } from "../crm/ai-proposals/party-proposal.types";

export const SupplierPartyProposalSchema = z.object({
  displayName: z.string(),
  roles: z.array(PartyRoleTypeSchema),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  billingAddress: AddressSchema.optional(),
  vatId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  duplicates: z
    .array(
      z.object({
        id: z.string(),
        displayName: z.string(),
        email: z.string().optional(),
        matchScore: z.number().min(0).max(1),
      })
    )
    .optional(),
});

export const SupplierPartyProposalCardSchema = z.object({
  ok: z.literal(true),
  proposal: SupplierPartyProposalSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type SupplierPartyProposalCard = z.infer<typeof SupplierPartyProposalCardSchema>;
