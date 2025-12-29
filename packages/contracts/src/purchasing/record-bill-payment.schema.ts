import { z } from "zod";
import { VendorBillDtoSchema } from "./vendor-bill.types";
import { BillPaymentMethodSchema } from "./vendor-bill.types";
import { localDateSchema } from "../shared/local-date.schema";

export const RecordBillPaymentInputSchema = z.object({
  vendorBillId: z.string(),
  amountCents: z.number().int().positive(),
  currency: z.string(),
  paymentDate: localDateSchema,
  method: BillPaymentMethodSchema,
  bankAccountId: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const RecordBillPaymentOutputSchema = z.object({
  vendorBill: VendorBillDtoSchema,
});

export type RecordBillPaymentInput = z.infer<typeof RecordBillPaymentInputSchema>;
export type RecordBillPaymentOutput = z.infer<typeof RecordBillPaymentOutputSchema>;
