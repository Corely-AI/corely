import { z } from "zod";
import { TaxReportDtoSchema } from "./tax.types";

/**
 * Input for generating an excise monthly report
 */
export const GenerateExciseReportInputSchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  currency: z.string().default("EUR"),
});

export type GenerateExciseReportInput = z.infer<typeof GenerateExciseReportInputSchema>;

/**
 * Output from generating an excise monthly report
 */
export const GenerateExciseReportOutputSchema = z.object({
  report: TaxReportDtoSchema,
});

export type GenerateExciseReportOutput = z.infer<typeof GenerateExciseReportOutputSchema>;

/**
 * Excise line item for report detail
 */
export const ExciseLineItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  exciseType: z.enum(["PERCENT", "AMOUNT"]),
  exciseValue: z.number(),
  quantitySold: z.number(),
  netSalesCents: z.number().int(),
  exciseCollectedCents: z.number().int(),
});

export type ExciseLineItem = z.infer<typeof ExciseLineItemSchema>;

/**
 * Detailed excise report summary
 */
export const ExciseReportSummarySchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  totalExciseCents: z.number().int(),
  lineItems: z.array(ExciseLineItemSchema),
  totalSalesCents: z.number().int(),
  currency: z.string(),
});

export type ExciseReportSummary = z.infer<typeof ExciseReportSummarySchema>;
