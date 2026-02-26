import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";
import { CustomerPackageSchema } from "./customer-package.types";
import { PackageUsageSchema } from "./package-usage.types";

export const ConsumeCustomerPackageInputSchema = z.object({
  idempotencyKey: z.string().min(1).optional(),
  usageId: z.string().uuid(),
  customerPackageId: z.string().uuid(),
  unitsUsed: z.number().int().positive(),
  usedAt: utcInstantSchema.optional(),
  sourceType: z.string().nullable().optional(),
  sourceId: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  createdByEmployeePartyId: z.string().uuid().nullable().optional(),
});

export const ConsumeCustomerPackageOutputSchema = z.object({
  customerPackage: CustomerPackageSchema,
  usage: PackageUsageSchema,
});

export type ConsumeCustomerPackageInput = z.infer<typeof ConsumeCustomerPackageInputSchema>;
export type ConsumeCustomerPackageOutput = z.infer<typeof ConsumeCustomerPackageOutputSchema>;
