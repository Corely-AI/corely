import { Inject, Injectable } from "@nestjs/common";
import { type UpdateTenantInput, type TenantDto, type TenantStatus } from "@corely/contracts";
import { type UseCaseContext } from "@corely/kernel";
import {
  TENANT_REPOSITORY_TOKEN,
  type TenantRepositoryPort,
} from "../ports/tenant-repository.port";
import {
  ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN,
  type RolePermissionGrantRepositoryPort,
} from "../ports/role-permission-grant-repository.port";
import {
  assertPlatformPermission,
  PLATFORM_PERMISSION_KEYS,
} from "../policies/platform-permissions.policy";
import { NotFoundError } from "../../../../shared/errors/domain-errors";
import { Tenant } from "../../domain/entities/tenant.entity";

export interface UpdateTenantCommand {
  tenantId: string;
  input: UpdateTenantInput;
}

@Injectable()
export class UpdateTenantUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY_TOKEN) private readonly tenantRepo: TenantRepositoryPort,
    @Inject(ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN)
    private readonly grantRepo: RolePermissionGrantRepositoryPort
  ) {}

  async execute(command: UpdateTenantCommand, ctx: UseCaseContext): Promise<TenantDto> {
    await assertPlatformPermission(ctx, PLATFORM_PERMISSION_KEYS.tenants.write, {
      grantRepo: this.grantRepo,
    });

    const tenant = await this.tenantRepo.findById(command.tenantId);
    if (!tenant) {
      throw new NotFoundError(`Tenant with ID ${command.tenantId} not found`);
    }

    const updatedTenant = Tenant.restore({
      id: tenant.getId(),
      name: tenant.getName(),
      slug: tenant.getSlug(),
      status: command.input.status,
      createdAt: tenant.getCreatedAt(),
      timeZone: tenant.getTimeZone(),
    });

    await this.tenantRepo.update(updatedTenant);

    return {
      id: updatedTenant.getId(),
      name: updatedTenant.getName(),
      slug: updatedTenant.getSlug(),
      status: updatedTenant.getStatus() as TenantStatus,
    };
  }
}
