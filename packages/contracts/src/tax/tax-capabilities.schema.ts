import { z } from "zod";
import { VatFilingFrequencySchema } from "./tax.types";

/**
 * Per-strategy capability flags — tells frontend which actions are available.
 */
export const TaxStrategyCapabilitiesSchema = z.object({
  canFileVat: z.boolean(),
  canPayVat: z.boolean(),
  needsConsultant: z.boolean(),
  supportsReverseCharge: z.boolean(),
  supportsOss: z.boolean().default(false),
  vatFilingFrequency: VatFilingFrequencySchema.optional(),
});
export type TaxStrategyCapabilities = z.infer<typeof TaxStrategyCapabilitiesSchema>;

/**
 * Full capabilities response shape.
 */
export const TaxCapabilitiesSchema = z.object({
  paymentsEnabled: z.boolean(),
  strategy: TaxStrategyCapabilitiesSchema.optional(),
});
export type TaxCapabilities = z.infer<typeof TaxCapabilitiesSchema>;

export const GetTaxCapabilitiesResponseSchema = z.object({
  capabilities: TaxCapabilitiesSchema,
});
export type GetTaxCapabilitiesResponse = z.infer<typeof GetTaxCapabilitiesResponseSchema>;
