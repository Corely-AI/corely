import { Inject, Injectable } from "@nestjs/common";
import type { UpdateTenantUserRoleResponse } from "@corely/contracts";
import { ValidationFailedError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import {
  MEMBERSHIP_REPOSITORY_TOKEN,
  type MembershipRepositoryPort,
} from "../ports/membership-repository.port";
import { ROLE_REPOSITORY_TOKEN, type RoleRepositoryPort } from "../ports/role-repository.port";
import {
  ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN,
  type RolePermissionGrantRepositoryPort,
} from "../ports/role-permission-grant-repository.port";
import { USER_REPOSITORY_TOKEN, type UserRepositoryPort } from "../ports/user-repository.port";
import { AUDIT_PORT_TOKEN, type AuditPort } from "../ports/audit.port";
import {
  assertPlatformPermission,
  PLATFORM_PERMISSION_KEYS,
} from "../policies/platform-permissions.policy";
import { Membership } from "../../domain/entities/membership.entity";
import { toTenantUserDto } from "../mappers/tenant-user.mapper";

export interface UpdateTenantUserRoleCommand {
  tenantId: string;
  membershipId: string;
  roleId: string;
}

@Injectable()
export class UpdateTenantUserRoleUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY_TOKEN)
    private readonly membershipRepo: MembershipRepositoryPort,
    @Inject(ROLE_REPOSITORY_TOKEN)
    private readonly roleRepo: RoleRepositoryPort,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: UserRepositoryPort,
    @Inject(ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN)
    private readonly grantRepo: RolePermissionGrantRepositoryPort,
    @Inject(AUDIT_PORT_TOKEN)
    private readonly audit: AuditPort
  ) {}

  async execute(
    command: UpdateTenantUserRoleCommand,
    ctx: UseCaseContext
  ): Promise<UpdateTenantUserRoleResponse> {
    await assertPlatformPermission(ctx, PLATFORM_PERMISSION_KEYS.tenants.write, {
      grantRepo: this.grantRepo,
    });

    const membership = await this.membershipRepo.findById(command.membershipId);
    if (!membership || membership.getTenantId() !== command.tenantId) {
      throw new ValidationFailedError("Validation failed", [
        { message: "Membership not found", members: ["membershipId"] },
      ]);
    }

    const role = await this.roleRepo.findById(command.tenantId, command.roleId);
    if (!role) {
      throw new ValidationFailedError("Validation failed", [
        { message: "Role not found", members: ["roleId"] },
      ]);
    }

    const updated = Membership.restore({
      id: membership.getId(),
      tenantId: membership.getTenantId(),
      userId: membership.getUserId(),
      roleId: command.roleId,
      createdAt: membership.getCreatedAt(),
    });
    await this.membershipRepo.update(updated);

    const user = await this.userRepo.findById(membership.getUserId());

    await this.audit.write({
      tenantId: command.tenantId,
      actorUserId: ctx.userId ?? null,
      action: "TenantUserRoleUpdated",
      targetType: "Membership",
      targetId: membership.getId(),
      metadataJson: JSON.stringify({
        roleId: command.roleId,
        roleName: role.name,
      }),
      context: {
        requestId: ctx.requestId,
        correlationId: ctx.correlationId,
      },
    });

    return {
      user: toTenantUserDto({
        membershipId: membership.getId(),
        userId: membership.getUserId(),
        email: user?.getEmail().getValue() ?? "unknown@example.com",
        name: user?.getName() ?? null,
        status: user?.getStatus() ?? "UNKNOWN",
        roleId: role.id,
        roleName: role.name,
        roleSystemKey: role.systemKey ?? null,
      }),
    };
  }
}
