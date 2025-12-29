import { z } from "zod";

export const PurchasingSettingsDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  defaultPaymentTerms: z.string().nullable().optional(),
  defaultCurrency: z.string(),
  poNumberingPrefix: z.string(),
  poNextNumber: z.number().int().positive(),
  billInternalRefPrefix: z.string().nullable().optional(),
  billNextNumber: z.number().int().positive().nullable().optional(),
  defaultAccountsPayableAccountId: z.string().nullable().optional(),
  defaultExpenseAccountId: z.string().nullable().optional(),
  defaultBankAccountId: z.string().nullable().optional(),
  autoPostOnBillPost: z.boolean(),
  autoPostOnPaymentRecord: z.boolean(),
  billDuplicateDetectionEnabled: z.boolean(),
  approvalRequiredForBills: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PurchasingSettingsDto = z.infer<typeof PurchasingSettingsDtoSchema>;

export const PurchasingAccountMappingSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  supplierPartyId: z.string(),
  categoryKey: z.string(),
  glAccountId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PurchasingAccountMappingDto = z.infer<typeof PurchasingAccountMappingSchema>;
