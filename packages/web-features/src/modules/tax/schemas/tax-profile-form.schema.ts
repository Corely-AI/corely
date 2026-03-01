import { z } from "zod";
import {
  TaxCountrySchema,
  TaxRegimeSchema,
  VatFilingFrequencySchema,
  VatAccountingMethodSchema,
  type UpsertTaxProfileInput,
} from "@corely/contracts";

/**
 * Form schema for tax profile
 * Extends contract schema with Date objects for better UX
 */
export const taxProfileFormSchema = z.object({
  country: TaxCountrySchema,
  regime: TaxRegimeSchema,
  vatEnabled: z.boolean().default(true),
  vatId: z.string().optional(),
  currency: z.string().default("EUR"),
  filingFrequency: VatFilingFrequencySchema,
  vatAccountingMethod: VatAccountingMethodSchema,
  taxYearStartMonth: z.number().int().min(1).max(12).optional().nullable(),
  localTaxOfficeName: z.string().optional().nullable(),
  vatExemptionParagraph: z.string().optional().nullable(),
  usesTaxAdvisor: z.boolean().default(false),
  effectiveFrom: z.date(),
  effectiveTo: z.date().optional().nullable(),
});

export type TaxProfileFormData = z.infer<typeof taxProfileFormSchema>;

/**
 * Transform form data to API request format
 * Converts Date objects to ISO strings
 */
export function toUpsertTaxProfileInput(form: TaxProfileFormData): UpsertTaxProfileInput {
  return {
    country: form.country,
    regime: form.regime,
    vatEnabled: form.vatEnabled,
    vatId: form.vatId || undefined,
    currency: form.currency,
    filingFrequency: form.filingFrequency,
    vatAccountingMethod: form.vatAccountingMethod,
    taxYearStartMonth: form.taxYearStartMonth ?? null,
    localTaxOfficeName: form.localTaxOfficeName ?? null,
    vatExemptionParagraph: form.vatExemptionParagraph ?? null,
    usesTaxAdvisor: form.usesTaxAdvisor,
    effectiveFrom: form.effectiveFrom.toISOString(),
    effectiveTo: form.effectiveTo?.toISOString() || undefined,
  };
}

/**
 * Default values for new tax profile form
 */
export function getDefaultTaxProfileFormValues(): Partial<TaxProfileFormData> {
  return {
    country: "DE",
    regime: "STANDARD_VAT",
    vatEnabled: true,
    currency: "EUR",
    filingFrequency: "QUARTERLY",
    vatAccountingMethod: "IST",
    taxYearStartMonth: null,
    localTaxOfficeName: "",
    usesTaxAdvisor: false,
    effectiveFrom: new Date(),
  };
}

/**
 * Transform DTO to form data
 */
export function taxProfileDtoToFormData(dto: any): TaxProfileFormData {
  return {
    country: dto.country,
    regime: dto.regime,
    vatEnabled: dto.vatEnabled ?? true,
    vatId: dto.vatId || undefined,
    currency: dto.currency,
    filingFrequency: dto.filingFrequency,
    vatAccountingMethod: dto.vatAccountingMethod ?? "IST",
    taxYearStartMonth: dto.taxYearStartMonth ?? null,
    localTaxOfficeName: dto.localTaxOfficeName ?? null,
    vatExemptionParagraph: dto.vatExemptionParagraph ?? null,
    usesTaxAdvisor: dto.usesTaxAdvisor ?? false,
    effectiveFrom: new Date(dto.effectiveFrom),
    effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
  };
}
