import { z } from "zod";
import { LoyaltyAccountSchema } from "./loyalty-account.types";
import { LoyaltyLedgerEntrySchema } from "./loyalty-ledger-entry.types";

export const CreateLoyaltyRedeemEntryInputSchema = z.object({
  idempotencyKey: z.string().min(1).optional(),
  entryId: z.string().uuid(),
  customerPartyId: z.string().min(1),
  pointsDelta: z.number().int().positive(),
  reason: z.string().max(500).optional().nullable(),
  sourceType: z.string().optional().nullable(),
  sourceId: z.string().optional().nullable(),
  createdByEmployeePartyId: z.string().min(1).optional().nullable(),
});

export const CreateLoyaltyRedeemEntryOutputSchema = z.object({
  entry: LoyaltyLedgerEntrySchema,
  account: LoyaltyAccountSchema,
});

export type CreateLoyaltyRedeemEntryInput = z.infer<typeof CreateLoyaltyRedeemEntryInputSchema>;
export type CreateLoyaltyRedeemEntryOutput = z.infer<typeof CreateLoyaltyRedeemEntryOutputSchema>;
