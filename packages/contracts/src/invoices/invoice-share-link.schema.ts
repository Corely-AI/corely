import { z } from "zod";

export const GenerateInvoiceShareLinkInputSchema = z.object({
  regenerate: z.boolean().optional().default(false),
});

export const GenerateInvoiceShareLinkOutputSchema = z.object({
  url: z.string().url(),
});

export const GetInvoiceShareLinkOutputSchema = z.object({
  url: z.string().url().nullable(),
});

export type GenerateInvoiceShareLinkInput = z.infer<typeof GenerateInvoiceShareLinkInputSchema>;
export type GenerateInvoiceShareLinkOutput = z.infer<typeof GenerateInvoiceShareLinkOutputSchema>;
export type GetInvoiceShareLinkOutput = z.infer<typeof GetInvoiceShareLinkOutputSchema>;
