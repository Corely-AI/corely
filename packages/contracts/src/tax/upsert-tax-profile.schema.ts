import { z } from "zod";
import {
  TaxCountrySchema,
  TaxRegimeSchema,
  VatFilingFrequencySchema,
  TaxProfileDtoSchema,
} from "./tax.types";

/**
 * Upsert Tax Profile Input
 * Creates or updates tenant's tax configuration
 */
export const UpsertTaxProfileInputSchema = z.object({
  country: TaxCountrySchema,
  regime: TaxRegimeSchema,
  vatEnabled: z.boolean().optional(),
  vatId: z.string().optional().nullable(),
  currency: z.string().default("EUR"),
  filingFrequency: VatFilingFrequencySchema,
  taxYearStartMonth: z.number().int().min(1).max(12).optional().nullable(),
  vatAccountingMethod: z.enum(["IST", "SOLL"]).optional(),
  localTaxOfficeName: z.string().optional().nullable(),
  vatExemptionParagraph: z.string().optional().nullable(),
  euB2BSales: z.boolean().optional(),
  hasEmployees: z.boolean().optional(),
  usesTaxAdvisor: z.boolean().optional(),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional().nullable(),
  idempotencyKey: z.string().optional(),
});

export const UpsertTaxProfileOutputSchema = z.object({
  profile: TaxProfileDtoSchema,
});

export type UpsertTaxProfileInput = z.infer<typeof UpsertTaxProfileInputSchema>;
export type UpsertTaxProfileOutput = z.infer<typeof UpsertTaxProfileOutputSchema>;
