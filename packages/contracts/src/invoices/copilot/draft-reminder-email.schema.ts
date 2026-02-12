import { z } from "zod";
import {
  InvoiceEmailDraftLanguageSchema,
  InvoiceEmailDraftOutputSchema,
} from "./draft-issue-email.schema";

export const InvoiceReminderEmailDraftToneSchema = z.enum(["polite", "normal", "firm"]);
export type InvoiceReminderEmailDraftTone = z.infer<typeof InvoiceReminderEmailDraftToneSchema>;

export const DraftInvoiceReminderEmailInputSchema = z.object({
  invoiceId: z.string().min(1),
  language: InvoiceEmailDraftLanguageSchema,
  tone: InvoiceReminderEmailDraftToneSchema,
});
export type DraftInvoiceReminderEmailInput = z.infer<typeof DraftInvoiceReminderEmailInputSchema>;

export const DraftInvoiceReminderEmailOutputSchema = InvoiceEmailDraftOutputSchema;
export type DraftInvoiceReminderEmailOutput = z.infer<typeof DraftInvoiceReminderEmailOutputSchema>;
