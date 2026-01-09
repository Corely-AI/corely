import { z } from "zod";
import { PurchasingSettingsDtoSchema } from "./settings.types";

export const GetPurchasingSettingsInputSchema = z.object({});

export const GetPurchasingSettingsOutputSchema = z.object({
  settings: PurchasingSettingsDtoSchema,
});

export type GetPurchasingSettingsInput = z.infer<typeof GetPurchasingSettingsInputSchema>;
export type GetPurchasingSettingsOutput = z.infer<typeof GetPurchasingSettingsOutputSchema>;
