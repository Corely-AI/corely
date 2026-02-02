import { z } from "zod";
import { LineDirectionSchema } from "@corely/contracts";
import type { TFunction } from "i18next";
import i18n from "@/shared/i18n";

/**
 * Frontend form schema for journal entry lines
 */
export const createJournalLineFormSchema = (t: TFunction) =>
  z.object({
    ledgerAccountId: z.string().min(1, t("accounting.validation.accountRequired")),
    direction: LineDirectionSchema,
    amountCents: z.number().int().positive(t("accounting.validation.amountPositive")),
    currency: z.string(),
    lineMemo: z.string().nullable().optional(),
  });

/**
 * Frontend form schema for creating/editing journal entries
 */
export const createJournalEntryFormSchema = (t: TFunction) => {
  const journalLineFormSchema = createJournalLineFormSchema(t);
  return z.object({
    postingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t("accounting.validation.invalidDate")),
    memo: z.string().min(1, t("accounting.validation.memoRequired")).max(500),
    lines: z
      .array(journalLineFormSchema)
      .min(2, t("accounting.validation.minimumLines"))
      .refine(
        (lines) => {
          const totalDebits = lines
            .filter((l) => l.direction === "Debit")
            .reduce((sum, l) => sum + l.amountCents, 0);
          const totalCredits = lines
            .filter((l) => l.direction === "Credit")
            .reduce((sum, l) => sum + l.amountCents, 0);
          return totalDebits === totalCredits;
        },
        {
          message: t("accounting.validation.debitsEqualCredits"),
        }
      ),
  });
};

export const journalLineFormSchema = createJournalLineFormSchema(i18n.t.bind(i18n));
export const journalEntryFormSchema = createJournalEntryFormSchema(i18n.t.bind(i18n));

export type JournalEntryFormData = z.infer<ReturnType<typeof createJournalEntryFormSchema>>;
