import { z } from "zod";

export const RunInvoiceRemindersInputSchema = z.object({
  daysOverdue: z.number().int().positive().optional(),
});
export type RunInvoiceRemindersInput = z.infer<typeof RunInvoiceRemindersInputSchema>;

export const RunInvoiceRemindersOutputSchema = z.object({
  processed: z.number().int().nonnegative(),
  sent: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
});
export type RunInvoiceRemindersOutput = z.infer<typeof RunInvoiceRemindersOutputSchema>;
