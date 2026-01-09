import { z } from "zod";
import { PurchasingSettingsDtoSchema } from "./settings.types";

export const UpdatePurchasingSettingsInputSchema = z.object({
  defaultPaymentTerms: z.string().nullable().optional(),
  defaultCurrency: z.string().optional(),
  poNumberingPrefix: z.string().optional(),
  billInternalRefPrefix: z.string().nullable().optional(),
  defaultAccountsPayableAccountId: z.string().nullable().optional(),
  defaultExpenseAccountId: z.string().nullable().optional(),
  defaultBankAccountId: z.string().nullable().optional(),
  autoPostOnBillPost: z.boolean().optional(),
  autoPostOnPaymentRecord: z.boolean().optional(),
  billDuplicateDetectionEnabled: z.boolean().optional(),
  approvalRequiredForBills: z.boolean().optional(),
  idempotencyKey: z.string().optional(),
});

export const UpdatePurchasingSettingsOutputSchema = z.object({
  settings: PurchasingSettingsDtoSchema,
});

export type UpdatePurchasingSettingsInput = z.infer<typeof UpdatePurchasingSettingsInputSchema>;
export type UpdatePurchasingSettingsOutput = z.infer<typeof UpdatePurchasingSettingsOutputSchema>;
