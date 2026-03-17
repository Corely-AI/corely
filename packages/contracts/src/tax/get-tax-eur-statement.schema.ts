import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const TaxEurBasisSchema = z.literal("cash");
export type TaxEurBasis = z.infer<typeof TaxEurBasisSchema>;

export const TaxEurLineGroupSchema = z.enum(["INCOME", "EXPENSE"]);
export type TaxEurLineGroup = z.infer<typeof TaxEurLineGroupSchema>;

export const TaxEurLineDtoSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  group: TaxEurLineGroupSchema,
  amountCents: z.number().int(),
});
export type TaxEurLineDto = z.infer<typeof TaxEurLineDtoSchema>;

export const TaxEurStatementDtoSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  currency: z.string().min(3).max(3),
  jurisdiction: z.literal("DE"),
  basis: TaxEurBasisSchema,
  lines: z.array(TaxEurLineDtoSchema),
  totals: z.object({
    incomeCents: z.number().int(),
    expenseCents: z.number().int(),
    profitCents: z.number().int(),
  }),
  generatedAt: utcInstantSchema,
});
export type TaxEurStatementDto = z.infer<typeof TaxEurStatementDtoSchema>;

export const GetTaxEurStatementQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});
export type GetTaxEurStatementQuery = z.infer<typeof GetTaxEurStatementQuerySchema>;

export const GetTaxEurStatementOutputSchema = z.object({
  statement: TaxEurStatementDtoSchema,
});
export type GetTaxEurStatementOutput = z.infer<typeof GetTaxEurStatementOutputSchema>;
