import { z } from "zod";

export const InvoiceEmailDraftLanguageSchema = z.enum(["de", "vi", "en"]);
export type InvoiceEmailDraftLanguage = z.infer<typeof InvoiceEmailDraftLanguageSchema>;

export const InvoiceIssueEmailDraftToneSchema = z.enum(["friendly", "neutral"]);
export type InvoiceIssueEmailDraftTone = z.infer<typeof InvoiceIssueEmailDraftToneSchema>;

export const InvoiceEmailDraftOutputSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
});
export type InvoiceEmailDraftOutput = z.infer<typeof InvoiceEmailDraftOutputSchema>;

export const DraftInvoiceIssueEmailInputSchema = z.object({
  invoiceId: z.string().min(1),
  language: InvoiceEmailDraftLanguageSchema,
  tone: InvoiceIssueEmailDraftToneSchema,
});
export type DraftInvoiceIssueEmailInput = z.infer<typeof DraftInvoiceIssueEmailInputSchema>;

export const DraftInvoiceIssueEmailOutputSchema = InvoiceEmailDraftOutputSchema;
export type DraftInvoiceIssueEmailOutput = z.infer<typeof DraftInvoiceIssueEmailOutputSchema>;
