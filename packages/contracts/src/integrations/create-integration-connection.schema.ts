import { z } from "zod";
import {
  IntegrationAuthMethodSchema,
  IntegrationConnectionDtoSchema,
  IntegrationKindSchema,
} from "./integration.types";

export const CreateIntegrationConnectionInputSchema = z.object({
  workspaceId: z.string().min(1),
  kind: IntegrationKindSchema,
  authMethod: IntegrationAuthMethodSchema,
  displayName: z.string().max(120).optional(),
  config: z.record(z.unknown()).default({}),
  secret: z.string().min(1).optional(),
});
export type CreateIntegrationConnectionInput = z.infer<
  typeof CreateIntegrationConnectionInputSchema
>;

export const CreateIntegrationConnectionOutputSchema = z.object({
  connection: IntegrationConnectionDtoSchema,
});
export type CreateIntegrationConnectionOutput = z.infer<
  typeof CreateIntegrationConnectionOutputSchema
>;
