import { z } from "zod";
import { InvoiceDtoSchema, InvoiceStatusSchema } from "./invoice.types";
import { localDateSchema } from "../shared/local-date.schema";
import { ListQuerySchema, PageInfoSchema } from "../common/list.contract";

export const ListInvoicesInputSchema = ListQuerySchema.extend({
  status: InvoiceStatusSchema.optional(),
  customerPartyId: z.string().optional(),
  fromDate: localDateSchema.optional(),
  toDate: localDateSchema.optional(),
  cursor: z.string().optional(),
});

export const ListInvoicesOutputSchema = z.object({
  items: z.array(InvoiceDtoSchema),
  nextCursor: z.string().nullable().optional(),
  pageInfo: PageInfoSchema.optional(),
});

export type ListInvoicesInput = z.infer<typeof ListInvoicesInputSchema>;
export type ListInvoicesOutput = z.infer<typeof ListInvoicesOutputSchema>;
