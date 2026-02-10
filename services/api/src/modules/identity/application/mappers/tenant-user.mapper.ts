import type { TenantUserDto } from "@corely/contracts";

export const toTenantUserDto = (params: {
  membershipId: string;
  userId: string;
  email: string;
  name: string | null;
  status: string;
  roleId: string;
  roleName: string;
  roleSystemKey: string | null;
}): TenantUserDto => ({
  membershipId: params.membershipId,
  userId: params.userId,
  email: params.email,
  name: params.name,
  status: params.status,
  roleId: params.roleId,
  roleName: params.roleName,
  roleSystemKey: params.roleSystemKey,
});
