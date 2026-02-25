import { z } from "zod";

export const IntegrationKindSchema = z.enum([
  "sumup",
  "adyen",
  "stripe_terminal",
  "microsoft_graph_mail",
  "google_gmail",
]);
export type IntegrationKind = z.infer<typeof IntegrationKindSchema>;

export const IntegrationAuthMethodSchema = z.enum(["api_key", "oauth2"]);
export type IntegrationAuthMethod = z.infer<typeof IntegrationAuthMethodSchema>;

export const IntegrationConnectionStatusSchema = z.enum(["active", "invalid", "disabled"]);
export type IntegrationConnectionStatus = z.infer<typeof IntegrationConnectionStatusSchema>;

export const IntegrationConnectionDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  kind: IntegrationKindSchema,
  authMethod: IntegrationAuthMethodSchema,
  status: IntegrationConnectionStatusSchema,
  displayName: z.string().nullable().optional(),
  config: z.record(z.unknown()).default({}),
  hasSecret: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type IntegrationConnectionDto = z.infer<typeof IntegrationConnectionDtoSchema>;

export const IntegrationErrorCodeSchema = z.enum([
  "Integrations:ConnectionNotFound",
  "Integrations:ConnectionInactive",
  "Integrations:ProviderUnsupported",
  "Integrations:SecretMissing",
  "ExternalService:sumup",
  "ExternalService:microsoft_graph_mail",
  "ExternalService:google_gmail",
  "ExternalService:adyen",
  "ExternalService:stripe_terminal",
]);
export type IntegrationErrorCode = z.infer<typeof IntegrationErrorCodeSchema>;
