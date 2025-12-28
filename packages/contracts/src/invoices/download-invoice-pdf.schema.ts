import { z } from "zod";

export const DownloadInvoicePdfInputSchema = z.object({
  invoiceId: z.string(),
});

export const DownloadInvoicePdfOutputSchema = z.object({
  downloadUrl: z.string().url(),
  expiresAt: z.string(),
});

export type DownloadInvoicePdfInput = z.infer<typeof DownloadInvoicePdfInputSchema>;
export type DownloadInvoicePdfOutput = z.infer<typeof DownloadInvoicePdfOutputSchema>;
