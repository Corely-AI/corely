import { z } from "zod";

export const PermissionDefinitionSchema = z.object({
  key: z.string(),
  group: z.string(),
  label: z.string(),
  description: z.string().optional(),
  danger: z.boolean().optional(),
});
export type PermissionDefinition = z.infer<typeof PermissionDefinitionSchema>;

export const PermissionGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  permissions: z.array(PermissionDefinitionSchema),
});
export type PermissionGroup = z.infer<typeof PermissionGroupSchema>;

export const PermissionCatalogResponseSchema = z.object({
  catalog: z.array(PermissionGroupSchema),
});
export type PermissionCatalogResponse = z.infer<typeof PermissionCatalogResponseSchema>;

export const EffectivePermissionSetSchema = z.object({
  allowAll: z.boolean(),
  allowed: z.array(z.string()),
  denied: z.array(z.string()),
});
export type EffectivePermissionSet = z.infer<typeof EffectivePermissionSetSchema>;

export const EffectivePermissionsResponseSchema = z.object({
  permissions: EffectivePermissionSetSchema,
});
export type EffectivePermissionsResponse = z.infer<typeof EffectivePermissionsResponseSchema>;
