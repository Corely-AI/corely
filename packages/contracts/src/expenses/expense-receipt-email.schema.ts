import { z } from "zod";
import { localDateSchema } from "../shared/local-date.schema";

export const ExpenseReceiptEmailSettingsSchema = z.object({
  available: z.boolean(),
  enabled: z.boolean(),
  address: z.string().nullable(),
  personalAddress: z.string().nullable(),
  canManage: z.boolean(),
  canForward: z.boolean(),
});
export const SetExpenseReceiptEmailSchema = z.object({ enabled: z.boolean() });
export const AssignExpenseReceiptSchema = z.object({ userId: z.string().min(1) });

export const ExpenseReceiptDraftFieldsSchema = z.object({
  merchant: z.string().trim().max(255).nullable(),
  expenseDate: localDateSchema.nullable(),
  amountCents: z.number().int().positive().max(2147483647).nullable(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .nullable(),
  category: z.string().trim().max(120).nullable(),
});

export const ExpenseReceiptDraftSchema = ExpenseReceiptDraftFieldsSchema.extend({
  id: z.string(),
  filename: z.string(),
  receivedAt: z.string().datetime(),
  claimantUserId: z.string().nullable(),
  submittedExpenseId: z.string().nullable(),
});

export const ListExpenseReceiptDraftsSchema = z.object({
  items: z.array(ExpenseReceiptDraftSchema),
  nextCursor: z.string().nullable(),
  canReview: z.boolean(),
});

export const UpdateExpenseReceiptDraftSchema = ExpenseReceiptDraftFieldsSchema.extend({
  submit: z.boolean().default(false),
});

export type ExpenseReceiptEmailSettings = z.infer<typeof ExpenseReceiptEmailSettingsSchema>;
export type ExpenseReceiptDraft = z.infer<typeof ExpenseReceiptDraftSchema>;
export type ExpenseReceiptDraftFields = z.infer<typeof ExpenseReceiptDraftFieldsSchema>;
export type ListExpenseReceiptDrafts = z.infer<typeof ListExpenseReceiptDraftsSchema>;

export const EMAILED_EXPENSE_PREFIX = "email-receipt-";
