import { z } from "zod";
import { VendorBillDtoSchema } from "./vendor-bill.types";

export const PostVendorBillInputSchema = z.object({
  vendorBillId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const PostVendorBillOutputSchema = z.object({
  vendorBill: VendorBillDtoSchema,
});

export type PostVendorBillInput = z.infer<typeof PostVendorBillInputSchema>;
export type PostVendorBillOutput = z.infer<typeof PostVendorBillOutputSchema>;
