import { z } from "zod";
import { VendorBillDtoSchema, VendorBillStatusSchema } from "./vendor-bill.types";
import { localDateSchema } from "../shared/local-date.schema";

export const ListVendorBillsInputSchema = z.object({
  status: VendorBillStatusSchema.optional(),
  supplierPartyId: z.string().optional(),
  fromDate: localDateSchema.optional(),
  toDate: localDateSchema.optional(),
  dueFromDate: localDateSchema.optional(),
  dueToDate: localDateSchema.optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

export const ListVendorBillsOutputSchema = z.object({
  items: z.array(VendorBillDtoSchema),
  nextCursor: z.string().nullable().optional(),
});

export type ListVendorBillsInput = z.infer<typeof ListVendorBillsInputSchema>;
export type ListVendorBillsOutput = z.infer<typeof ListVendorBillsOutputSchema>;
