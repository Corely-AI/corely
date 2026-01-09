import { z } from "zod";
import { PurchaseOrderDtoSchema, PurchaseOrderStatusSchema } from "./purchase-order.types";
import { localDateSchema } from "../shared/local-date.schema";

export const ListPurchaseOrdersInputSchema = z.object({
  status: PurchaseOrderStatusSchema.optional(),
  supplierPartyId: z.string().optional(),
  fromDate: localDateSchema.optional(),
  toDate: localDateSchema.optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

export const ListPurchaseOrdersOutputSchema = z.object({
  items: z.array(PurchaseOrderDtoSchema),
  nextCursor: z.string().nullable().optional(),
});

export type ListPurchaseOrdersInput = z.infer<typeof ListPurchaseOrdersInputSchema>;
export type ListPurchaseOrdersOutput = z.infer<typeof ListPurchaseOrdersOutputSchema>;
