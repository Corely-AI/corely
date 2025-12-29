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
