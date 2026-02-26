import { z } from "zod";
import {
  IntegrationConnectionDtoSchema,
  IntegrationConnectionStatusSchema,
} from "./integration.types";

export const UpdateIntegrationConnectionInputSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().max(120).optional(),
  status: IntegrationConnectionStatusSchema.optional(),
  config: z.record(z.unknown()).optional(),
  secret: z.string().min(1).optional(),
});
export type UpdateIntegrationConnectionInput = z.infer<
  typeof UpdateIntegrationConnectionInputSchema
>;

export const UpdateIntegrationConnectionOutputSchema = z.object({
  connection: IntegrationConnectionDtoSchema,
});
export type UpdateIntegrationConnectionOutput = z.infer<
  typeof UpdateIntegrationConnectionOutputSchema
>;
