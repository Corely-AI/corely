import { z } from "zod";
import { VendorBillDtoSchema } from "./vendor-bill.types";

export const VoidVendorBillInputSchema = z.object({
  vendorBillId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const VoidVendorBillOutputSchema = z.object({
  vendorBill: VendorBillDtoSchema,
});

export type VoidVendorBillInput = z.infer<typeof VoidVendorBillInputSchema>;
export type VoidVendorBillOutput = z.infer<typeof VoidVendorBillOutputSchema>;
