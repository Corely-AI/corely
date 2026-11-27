import { z } from "zod";

export const InvoiceEmailSettingsSchema = z.object({
  available: z.boolean(),
  enabled: z.boolean(),
  address: z.string().nullable(),
});

export const UpdateInvoiceEmailSettingsSchema = z.object({ enabled: z.boolean() });

export const VendorBillOriginalSchema = z.object({ url: z.string() });

export type InvoiceEmailSettings = z.infer<typeof InvoiceEmailSettingsSchema>;
export type VendorBillOriginal = z.infer<typeof VendorBillOriginalSchema>;
