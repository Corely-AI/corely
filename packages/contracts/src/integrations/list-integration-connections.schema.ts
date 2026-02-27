import { z } from "zod";
import { IntegrationConnectionDtoSchema, IntegrationKindSchema } from "./integration.types";

export const ListIntegrationConnectionsInputSchema = z.object({
  workspaceId: z.string().optional(),
  kind: IntegrationKindSchema.optional(),
});
export type ListIntegrationConnectionsInput = z.infer<typeof ListIntegrationConnectionsInputSchema>;

export const ListIntegrationConnectionsOutputSchema = z.object({
  items: z.array(IntegrationConnectionDtoSchema),
});
export type ListIntegrationConnectionsOutput = z.infer<
  typeof ListIntegrationConnectionsOutputSchema
>;
