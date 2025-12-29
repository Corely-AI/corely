import { z } from "zod";
import { VendorBillDtoSchema } from "./vendor-bill.types";

export const GetVendorBillInputSchema = z.object({
  vendorBillId: z.string(),
});

export const GetVendorBillOutputSchema = z.object({
  vendorBill: VendorBillDtoSchema,
});

export type GetVendorBillInput = z.infer<typeof GetVendorBillInputSchema>;
export type GetVendorBillOutput = z.infer<typeof GetVendorBillOutputSchema>;
