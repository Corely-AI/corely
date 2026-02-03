import { z } from "zod";
import { AccountTypeSchema } from "@corely/contracts";
import type { TFunction } from "i18next";
import i18n from "@/shared/i18n";

/**
 * Frontend form schema for creating/editing ledger accounts
 */
export const createLedgerAccountFormSchema = (t: TFunction) =>
  z.object({
    code: z
      .string()
      .min(1, t("accounting.validation.accountCodeRequired"))
      .max(20, t("accounting.validation.accountCodeMax"))
      .regex(/^[A-Z0-9-]+$/, t("accounting.validation.accountCodeFormat")),
    name: z
      .string()
      .min(1, t("accounting.validation.accountNameRequired"))
      .max(100, t("accounting.validation.accountNameMax")),
    type: AccountTypeSchema,
    description: z.string().max(500).optional().nullable(),
    isActive: z.boolean().default(true),
  });

export const ledgerAccountFormSchema = createLedgerAccountFormSchema(i18n.t.bind(i18n));

export type LedgerAccountFormData = z.infer<ReturnType<typeof createLedgerAccountFormSchema>>;
