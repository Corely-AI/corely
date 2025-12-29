import { z } from "zod";
import { BillPaymentSchema } from "./vendor-bill.types";

export const ListBillPaymentsInputSchema = z.object({
  vendorBillId: z.string(),
});

export const ListBillPaymentsOutputSchema = z.object({
  payments: z.array(BillPaymentSchema),
});

export type ListBillPaymentsInput = z.infer<typeof ListBillPaymentsInputSchema>;
export type ListBillPaymentsOutput = z.infer<typeof ListBillPaymentsOutputSchema>;
