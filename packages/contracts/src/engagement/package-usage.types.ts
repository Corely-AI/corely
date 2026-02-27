import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const PackageUsageSchema = z.object({
  tenantId: z.string(),
  usageId: z.string().uuid(),
  customerPackageId: z.string().uuid(),
  customerPartyId: z.string().uuid(),
  unitsUsed: z.number().int().positive(),
  usedAt: utcInstantSchema,
  sourceType: z.string().nullable().optional(),
  sourceId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdByEmployeePartyId: z.string().uuid().nullable().optional(),
});

export type PackageUsage = z.infer<typeof PackageUsageSchema>;
