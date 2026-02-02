import { z } from "zod";
import { CurrencyCodeSchema } from "../money/currency.schema";

import { localDateSchema, utcInstantSchema } from "../shared/local-date.schema";

export const ExpenseStatusSchema = z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "PAID"]);
export type ExpenseStatus = z.infer<typeof ExpenseStatusSchema>;

export const ExpenseLineSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number().int().positive().default(1),
  unitPriceCents: z.number().int(),
  lineTotalCents: z.number().int(),
  taxRate: z.number().optional().nullable(),
  category: z.string().optional().nullable(),
  createdAt: utcInstantSchema,
});
export type ExpenseLineDto = z.infer<typeof ExpenseLineSchema>;

export const ExpenseReceiptSchema = z.object({
  documentId: z.string(),
});
export type ExpenseReceiptDto = z.infer<typeof ExpenseReceiptSchema>;

export const ExpenseDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  status: ExpenseStatusSchema,
  expenseDate: localDateSchema,
  merchantName: z.string().optional().nullable(),
  supplierPartyId: z.string().optional().nullable(),
  currency: CurrencyCodeSchema,
  notes: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  totalAmountCents: z.number().int(),
  taxAmountCents: z.number().int().optional().nullable(),
  archivedAt: utcInstantSchema.optional().nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
  lines: z.array(ExpenseLineSchema),
  receipts: z.array(ExpenseReceiptSchema).optional(),
  custom: z.record(z.any()).optional().nullable(),
});
export type ExpenseDto = z.infer<typeof ExpenseDtoSchema>;
