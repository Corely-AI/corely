import { z } from "zod";
import { PermissionGroupSchema } from "./permissions.schema";

export const RoleDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  isSystem: z.boolean(),
});
export type RoleDto = z.infer<typeof RoleDtoSchema>;

export const CreateRoleInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
});
export type CreateRoleInput = z.infer<typeof CreateRoleInputSchema>;

export const UpdateRoleInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});
export type UpdateRoleInput = z.infer<typeof UpdateRoleInputSchema>;

export const RolePermissionEffectSchema = z.enum(["ALLOW", "DENY"]);
export type RolePermissionEffect = z.infer<typeof RolePermissionEffectSchema>;

export const RolePermissionGrantSchema = z.object({
  key: z.string(),
  effect: RolePermissionEffectSchema.optional().default("ALLOW"),
});
export type RolePermissionGrant = z.infer<typeof RolePermissionGrantSchema>;

export const RolePermissionStateSchema = z.object({
  key: z.string(),
  granted: z.boolean(),
  effect: RolePermissionEffectSchema.optional(),
});
export type RolePermissionState = z.infer<typeof RolePermissionStateSchema>;

export const UpdateRolePermissionsRequestSchema = z.object({
  grants: z.array(RolePermissionGrantSchema),
});
export type UpdateRolePermissionsRequest = z.infer<typeof UpdateRolePermissionsRequestSchema>;

export const RolePermissionsResponseSchema = z.object({
  role: RoleDtoSchema,
  catalog: z.array(PermissionGroupSchema),
  grants: z.array(RolePermissionStateSchema),
});
export type RolePermissionsResponse = z.infer<typeof RolePermissionsResponseSchema>;
