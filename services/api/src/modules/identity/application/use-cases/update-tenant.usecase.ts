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

    if (command.input.status) {
      tenant.updateDetails(undefined, undefined, command.input.status);
    }

    if (
      command.input.plan !== undefined ||
      command.input.planStatus !== undefined ||
      command.input.billingMethod !== undefined ||
      command.input.billingNote !== undefined
    ) {
      tenant.updateManualPlan(
        command.input.plan !== undefined ? command.input.plan : tenant.getPlan(),
        command.input.planStatus !== undefined ? command.input.planStatus : tenant.getPlanStatus(),
        command.input.billingMethod !== undefined
          ? command.input.billingMethod
          : tenant.getBillingMethod(),
        command.input.billingNote !== undefined
          ? command.input.billingNote
          : tenant.getBillingNote(),
        ctx.userId!
      );
    }

    await this.tenantRepo.update(tenant);

    return {
      id: tenant.getId(),
      name: tenant.getName(),
      slug: tenant.getSlug(),
      status: tenant.getStatus() as TenantStatus,
      plan: tenant.getPlan() as any,
      planStatus: tenant.getPlanStatus() as any,
      billingMethod: tenant.getBillingMethod() as any,
      billingNote: tenant.getBillingNote(),
      planUpdatedAt: tenant.getPlanUpdatedAt()?.toISOString() ?? null,
      planUpdatedBy: tenant.getPlanUpdatedBy(),
    };
  }
}
