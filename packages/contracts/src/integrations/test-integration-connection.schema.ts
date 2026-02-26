import { z } from "zod";
import { IntegrationErrorCodeSchema } from "./integration.types";

export const TestIntegrationConnectionInputSchema = z.object({
  id: z.string().min(1),
});
export type TestIntegrationConnectionInput = z.infer<typeof TestIntegrationConnectionInputSchema>;

export const TestIntegrationConnectionOutputSchema = z.object({
  ok: z.boolean(),
  code: IntegrationErrorCodeSchema.optional(),
  detail: z.string().optional(),
});
export type TestIntegrationConnectionOutput = z.infer<typeof TestIntegrationConnectionOutputSchema>;
