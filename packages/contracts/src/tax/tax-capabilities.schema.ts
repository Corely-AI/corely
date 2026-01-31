import { z } from "zod";

export const TaxCapabilitiesSchema = z.object({
  paymentsEnabled: z.boolean(),
});
export type TaxCapabilities = z.infer<typeof TaxCapabilitiesSchema>;

export const GetTaxCapabilitiesResponseSchema = z.object({
  capabilities: TaxCapabilitiesSchema,
});
export type GetTaxCapabilitiesResponse = z.infer<typeof GetTaxCapabilitiesResponseSchema>;
