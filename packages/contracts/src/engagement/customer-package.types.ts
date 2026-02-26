import { z } from "zod";
import { localDateSchema, utcInstantSchema } from "../shared/local-date.schema";

export const CustomerPackageStatusSchema = z.enum(["ACTIVE", "CANCELED", "EXPIRED", "DEPLETED"]);
export type CustomerPackageStatus = z.infer<typeof CustomerPackageStatusSchema>;

export const CustomerPackageSchema = z.object({
  tenantId: z.string(),
  customerPackageId: z.string().uuid(),
  customerPartyId: z.string().uuid(),
  name: z.string(),
  totalUnits: z.number().int().positive(),
  remainingUnits: z.number().int().nonnegative(),
  expiresOn: localDateSchema.nullable().optional(),
  status: CustomerPackageStatusSchema,
  notes: z.string().nullable().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});

export type CustomerPackage = z.infer<typeof CustomerPackageSchema>;
