import { z } from "zod";
import { TaxReportDtoSchema } from "./tax.types";

export const ArchiveVatPeriodInputSchema = z.object({
  reason: z.string().min(1),
  notes: z.string().optional(),
});

export const ArchiveVatPeriodOutputSchema = z.object({
  report: TaxReportDtoSchema,
});

export type ArchiveVatPeriodInput = z.infer<typeof ArchiveVatPeriodInputSchema>;
export type ArchiveVatPeriodOutput = z.infer<typeof ArchiveVatPeriodOutputSchema>;
