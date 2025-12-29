import { z } from "zod";
import { VendorBillDtoSchema } from "./vendor-bill.types";

export const ApproveVendorBillInputSchema = z.object({
  vendorBillId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const ApproveVendorBillOutputSchema = z.object({
  vendorBill: VendorBillDtoSchema,
});

export type ApproveVendorBillInput = z.infer<typeof ApproveVendorBillInputSchema>;
export type ApproveVendorBillOutput = z.infer<typeof ApproveVendorBillOutputSchema>;
