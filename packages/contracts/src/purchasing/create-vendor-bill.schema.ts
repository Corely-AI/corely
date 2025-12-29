import { z } from "zod";
import { VendorBillDtoSchema } from "./vendor-bill.types";
import { localDateSchema } from "../shared/local-date.schema";

export const VendorBillLineInputSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitCostCents: z.number().int().nonnegative(),
  category: z.string().optional(),
  glAccountId: z.string().optional(),
  taxCode: z.string().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const CreateVendorBillInputSchema = z.object({
  supplierPartyId: z.string(),
  supplierContactPartyId: z.string().optional(),
  billNumber: z.string().optional(),
  internalBillRef: z.string().optional(),
  billDate: localDateSchema,
  dueDate: localDateSchema,
  currency: z.string(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(VendorBillLineInputSchema).min(1),
  purchaseOrderId: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const CreateVendorBillOutputSchema = z.object({
  vendorBill: VendorBillDtoSchema,
});

export type VendorBillLineInput = z.infer<typeof VendorBillLineInputSchema>;
export type CreateVendorBillInput = z.infer<typeof CreateVendorBillInputSchema>;
export type CreateVendorBillOutput = z.infer<typeof CreateVendorBillOutputSchema>;
