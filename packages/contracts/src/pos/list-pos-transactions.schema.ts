import { z } from "zod";
import { ListQuerySchema, PageInfoSchema } from "../common/list.contract";
import { localDateSchema } from "../shared/local-date.schema";
import { PosSaleStatusSchema } from "./pos-sale.types";
import { PosTransactionSummarySchema } from "./transaction.types";

export const ListPosTransactionsInputSchema = ListQuerySchema.extend({
  registerId: z.string().uuid().optional(),
  status: PosSaleStatusSchema.optional(),
  fromDate: localDateSchema.optional(),
  toDate: localDateSchema.optional(),
});

export const ListPosTransactionsOutputSchema = z.object({
  items: z.array(PosTransactionSummarySchema),
  pageInfo: PageInfoSchema,
});

export type ListPosTransactionsInput = z.infer<typeof ListPosTransactionsInputSchema>;
export type ListPosTransactionsOutput = z.infer<typeof ListPosTransactionsOutputSchema>;
