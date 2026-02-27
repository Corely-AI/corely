import { z } from "zod";
import { localDateSchema } from "../shared/local-date.schema";
import { CustomerPackageSchema } from "./customer-package.types";

export const CreateCustomerPackageInputSchema = z.object({
  idempotencyKey: z.string().min(1).optional(),
  customerPackageId: z.string().uuid(),
  customerPartyId: z.string().min(1),
  name: z.string().min(1).max(200),
  totalUnits: z.number().int().positive(),
  expiresOn: localDateSchema.nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  createdByEmployeePartyId: z.string().min(1).nullable().optional(),
});

export const CreateCustomerPackageOutputSchema = z.object({
  customerPackage: CustomerPackageSchema,
});

export type CreateCustomerPackageInput = z.infer<typeof CreateCustomerPackageInputSchema>;
export type CreateCustomerPackageOutput = z.infer<typeof CreateCustomerPackageOutputSchema>;
