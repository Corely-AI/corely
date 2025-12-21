import { z } from "zod";
import { InvoiceDtoSchema, InvoiceStatusSchema } from "./invoice.types";

export const ListInvoicesInputSchema = z.object({
  status: InvoiceStatusSchema.optional(),
  customerId: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

export const ListInvoicesOutputSchema = z.object({
  items: z.array(InvoiceDtoSchema),
  nextCursor: z.string().nullable().optional(),
});

export type ListInvoicesInput = z.infer<typeof ListInvoicesInputSchema>;
export type ListInvoicesOutput = z.infer<typeof ListInvoicesOutputSchema>;
