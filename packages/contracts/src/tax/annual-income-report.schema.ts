import { z } from "zod";
import { localDateSchema } from "../shared/local-date.schema";

export const AnnualIncomeSourceTypeSchema = z.enum([
  "employment",
  "self_employed",
  "freelance",
  "capital_gains",
  "rental",
  "pension",
  "other",
]);
export type AnnualIncomeSourceType = z.infer<typeof AnnualIncomeSourceTypeSchema>;

export const AnnualIncomeSourceAmountsSchema = z.object({
  grossIncome: z.number().min(0),
  taxesWithheld: z.number().min(0).optional(),
  socialContributions: z.number().min(0).optional(),
  expensesRelated: z.number().min(0).optional(),
});
export type AnnualIncomeSourceAmounts = z.infer<typeof AnnualIncomeSourceAmountsSchema>;

export const AnnualIncomeSourcePeriodSchema = z
  .object({
    startDate: localDateSchema.optional(),
    endDate: localDateSchema.optional(),
  })
  .optional();
export type AnnualIncomeSourcePeriod = z.infer<typeof AnnualIncomeSourcePeriodSchema>;

export const AnnualIncomeSourceSchema = z
  .object({
    type: AnnualIncomeSourceTypeSchema,
    label: z.string().trim().min(1),
    payer: z.string().trim().min(1).optional(),
    country: z.string().trim().min(2).max(2).default("DE"),
    amounts: AnnualIncomeSourceAmountsSchema,
    period: AnnualIncomeSourcePeriodSchema,
    attachments: z
      .object({
        documentIds: z.array(z.string().min(1)).default([]),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    const period = value.period;
    if (!period) {
      return;
    }

    const hasStart = Boolean(period.startDate);
    const hasEnd = Boolean(period.endDate);
    if (hasStart !== hasEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Both startDate and endDate are required when period is provided.",
        path: ["period"],
      });
      return;
    }

    if (period.startDate && period.endDate && period.startDate > period.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startDate must be before or equal to endDate.",
        path: ["period", "startDate"],
      });
    }
  });
export type AnnualIncomeSource = z.infer<typeof AnnualIncomeSourceSchema>;

export const AnnualIncomeSectionPayloadSchema = z
  .object({
    incomeSources: z.array(AnnualIncomeSourceSchema).default([]),
    noIncomeFlag: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.noIncomeFlag && value.incomeSources.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "incomeSources must be empty when noIncomeFlag is true.",
        path: ["incomeSources"],
      });
    }
  });
export type AnnualIncomeSectionPayload = z.infer<typeof AnnualIncomeSectionPayloadSchema>;
