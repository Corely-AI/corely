import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const LoyaltyAccountStatusSchema = z.enum(["ACTIVE", "SUSPENDED"]);
export type LoyaltyAccountStatus = z.infer<typeof LoyaltyAccountStatusSchema>;

export const LoyaltyAccountSchema = z.object({
  tenantId: z.string(),
  loyaltyAccountId: z.string().uuid(),
  customerPartyId: z.string().uuid(),
  status: LoyaltyAccountStatusSchema,
  currentPointsBalance: z.number().int(),
  lifetimeEarnedPoints: z.number().int().nonnegative(),
  tier: z.string().nullable().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});

export type LoyaltyAccount = z.infer<typeof LoyaltyAccountSchema>;
