import { z } from "zod";
import { CustomerPackageSchema, CustomerPackageStatusSchema } from "./customer-package.types";

export const ListCustomerPackagesInputSchema = z.object({
  customerPartyId: z.string().min(1).optional(),
  status: CustomerPackageStatusSchema.optional(),
  includeInactive: z.boolean().optional(),
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().max(200).optional(),
});

export const ListCustomerPackagesOutputSchema = z.object({
  items: z.array(CustomerPackageSchema),
  nextCursor: z.string().nullable().optional(),
});

export type ListCustomerPackagesInput = z.infer<typeof ListCustomerPackagesInputSchema>;
export type ListCustomerPackagesOutput = z.infer<typeof ListCustomerPackagesOutputSchema>;
