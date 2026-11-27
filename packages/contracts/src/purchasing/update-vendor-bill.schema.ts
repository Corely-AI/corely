import { z } from "zod";
import { VendorBillDtoSchema } from "./vendor-bill.types";
import { VendorBillLineInputSchema } from "./create-vendor-bill.schema";
import { localDateSchema } from "../shared/local-date.schema";

export const VendorBillHeaderPatchSchema = z.object({
  supplierPartyId: z.string().nullish(),
  supplierContactPartyId: z.string().optional(),
  billNumber: z.string().nullish(),
  internalBillRef: z.string().optional(),
  billDate: localDateSchema.nullish(),
  dueDate: localDateSchema.nullish(),
  currency: z.string().nullish(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  purchaseOrderId: z.string().optional(),
});

export const VendorBillLinePatchSchema = VendorBillLineInputSchema.extend({
  id: z.string().optional(),
});

export const UpdateVendorBillInputSchema = z.object({
  vendorBillId: z.string(),
  headerPatch: VendorBillHeaderPatchSchema.optional(),
  lineItems: z.array(VendorBillLinePatchSchema).optional(),
  idempotencyKey: z.string().optional(),
});

export const UpdateVendorBillOutputSchema = z.object({
  vendorBill: VendorBillDtoSchema,
});

export type UpdateVendorBillInput = z.infer<typeof UpdateVendorBillInputSchema>;
export type UpdateVendorBillOutput = z.infer<typeof UpdateVendorBillOutputSchema>;
