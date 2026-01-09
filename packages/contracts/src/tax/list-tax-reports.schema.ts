import { z } from "zod";
import {
  TaxReportDtoSchema,
  type TaxReportStatusSchema,
  TaxReportGroupSchema,
  TaxReportTypeSchema,
} from "./tax.types";

export const ListTaxReportsInputSchema = z.object({
  status: z.enum(["upcoming", "submitted"]).optional().default("upcoming"),
  group: TaxReportGroupSchema.optional(),
  type: TaxReportTypeSchema.optional(),
});

export const ListTaxReportsOutputSchema = z.object({
  reports: z.array(TaxReportDtoSchema),
});

export type ListTaxReportsInput = z.infer<typeof ListTaxReportsInputSchema>;
export type ListTaxReportsOutput = z.infer<typeof ListTaxReportsOutputSchema>;
export type TaxReportStatusFilter = z.infer<typeof TaxReportStatusSchema>;
