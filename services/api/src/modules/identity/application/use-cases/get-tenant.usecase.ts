import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { type IUseCase, UseCaseContext } from "@corely/kernel";
import {
  TENANT_REPOSITORY_TOKEN,
  type TenantRepositoryPort,
} from "../ports/tenant-repository.port";

export interface GetTenantInput {
  tenantId: string;
}

export interface GetTenantOutput {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: Date;
}

@Injectable()
export class GetTenantUseCase implements IUseCase<GetTenantInput, GetTenantOutput> {
  constructor(
    @Inject(TENANT_REPOSITORY_TOKEN)
    private readonly tenantRepo: TenantRepositoryPort
  ) {}

  async execute(input: GetTenantInput, ctx: UseCaseContext): Promise<GetTenantOutput> {
    const tenant = await this.tenantRepo.findById(input.tenantId);

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${input.tenantId} not found`);
    }

    return {
      id: tenant.getId(),
      name: tenant.getName(),
      slug: tenant.getSlug(),
      status: tenant.getStatus(),
      createdAt: tenant.getCreatedAt(),
    };
  }
}
