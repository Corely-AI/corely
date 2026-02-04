import { Inject, Injectable } from "@nestjs/common";
import type { ListTenantUsersOutput } from "@corely/contracts";
import {
  MEMBERSHIP_REPOSITORY_TOKEN,
  type MembershipRepositoryPort,
} from "../ports/membership-repository.port";
import { USER_REPOSITORY_TOKEN, type UserRepositoryPort } from "../ports/user-repository.port";
import { ROLE_REPOSITORY_TOKEN, type RoleRepositoryPort } from "../ports/role-repository.port";
import {
  ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN,
  type RolePermissionGrantRepositoryPort,
} from "../ports/role-permission-grant-repository.port";
import {
  assertPlatformPermission,
  PLATFORM_PERMISSION_KEYS,
} from "../policies/platform-permissions.policy";
import type { UseCaseContext } from "@corely/kernel";
import { toTenantUserDto } from "../mappers/tenant-user.mapper";
import { TenantRoleSeederService } from "../services/tenant-role-seeder.service";

export interface ListTenantUsersQuery {
  tenantId: string;
}

@Injectable()
export class ListTenantUsersUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY_TOKEN)
    private readonly membershipRepo: MembershipRepositoryPort,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: UserRepositoryPort,
    @Inject(ROLE_REPOSITORY_TOKEN)
    private readonly roleRepo: RoleRepositoryPort,
    @Inject(ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN)
    private readonly grantRepo: RolePermissionGrantRepositoryPort,
    private readonly roleSeeder: TenantRoleSeederService
  ) {}

  async execute(query: ListTenantUsersQuery, ctx: UseCaseContext): Promise<ListTenantUsersOutput> {
    await assertPlatformPermission(ctx, PLATFORM_PERMISSION_KEYS.tenants.read, {
      grantRepo: this.grantRepo,
    });

    const memberships = await this.membershipRepo.findByTenantId(query.tenantId);
    let roles = await this.roleRepo.listByTenant(query.tenantId);

    // Lazy seed roles if none exist
    if (roles.length === 0) {
      await this.roleSeeder.seed(query.tenantId, ctx.userId ?? "system");
      roles = await this.roleRepo.listByTenant(query.tenantId);
    }

    const roleById = new Map(roles.map((role) => [role.id, role]));

    const users = await Promise.all(
      memberships.map(async (membership) => {
        const user = await this.userRepo.findById(membership.getUserId());
        const role = roleById.get(membership.getRoleId());
        return toTenantUserDto({
          membershipId: membership.getId(),
          userId: membership.getUserId(),
          email: user?.getEmail().getValue() ?? "unknown@example.com",
          name: user?.getName() ?? null,
          status: user?.getStatus() ?? "UNKNOWN",
          roleId: membership.getRoleId(),
          roleName: role?.name ?? "Unknown",
          roleSystemKey: role?.systemKey ?? null,
        });
      })
    );

    return {
      users,
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description ?? null,
        isSystem: role.isSystem,
        systemKey: role.systemKey ?? null,
      })),
    };
  }
}
