import { z } from "zod";
import { TaxPaymentsListQuerySchema } from "./list-tax-payments.schema";

export const ExportTaxPaymentsInputSchema = TaxPaymentsListQuerySchema;
export type ExportTaxPaymentsInput = z.infer<typeof ExportTaxPaymentsInputSchema>;

export const ExportTaxPaymentsResponseSchema = z.object({
  csv: z.string(),
});
export type ExportTaxPaymentsResponse = z.infer<typeof ExportTaxPaymentsResponseSchema>;
