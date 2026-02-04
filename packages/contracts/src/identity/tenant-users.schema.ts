import { z } from "zod";
import { RoleDtoSchema } from "./roles.schema";

export const TenantUserDtoSchema = z.object({
  membershipId: z.string(),
  userId: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  status: z.string(),
  roleId: z.string(),
  roleName: z.string(),
  roleSystemKey: z.string().nullable().optional(),
});
export type TenantUserDto = z.infer<typeof TenantUserDtoSchema>;

export const ListTenantUsersOutputSchema = z.object({
  users: z.array(TenantUserDtoSchema),
  roles: z.array(RoleDtoSchema),
});
export type ListTenantUsersOutput = z.infer<typeof ListTenantUsersOutputSchema>;

export const CreateTenantUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string().optional().nullable(),
  password: z.string().min(8),
  roleId: z.string().min(1),
  idempotencyKey: z.string().optional(),
});
export type CreateTenantUserInput = z.infer<typeof CreateTenantUserInputSchema>;

export const CreateTenantUserResponseSchema = z.object({
  user: TenantUserDtoSchema,
});
export type CreateTenantUserResponse = z.infer<typeof CreateTenantUserResponseSchema>;

export const UpdateTenantUserRoleInputSchema = z.object({
  roleId: z.string().min(1),
});
export type UpdateTenantUserRoleInput = z.infer<typeof UpdateTenantUserRoleInputSchema>;

export const UpdateTenantUserRoleResponseSchema = z.object({
  user: TenantUserDtoSchema,
});
export type UpdateTenantUserRoleResponse = z.infer<typeof UpdateTenantUserRoleResponseSchema>;
