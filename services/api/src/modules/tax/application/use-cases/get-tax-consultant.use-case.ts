import { Injectable } from "@nestjs/common";
import type { GetTaxConsultantOutput } from "@corely/contracts";
import { TaxConsultantRepoPort } from "../../domain/ports";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";

@RequireTenant()
@Injectable()
export class GetTaxConsultantUseCase extends BaseUseCase<void, GetTaxConsultantOutput> {
  constructor(private readonly repo: TaxConsultantRepoPort) {
    super({ logger: null as any });
  }

  protected async handle(
    _input: void,
    ctx: UseCaseContext
  ): Promise<Result<GetTaxConsultantOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const consultant = await this.repo.get(workspaceId);
    return ok({
      consultant: consultant
        ? {
            id: consultant.id,
            tenantId: consultant.tenantId,
            name: consultant.name,
            email: consultant.email ?? null,
            phone: consultant.phone ?? null,
            notes: consultant.notes ?? null,
            createdAt: consultant.createdAt.toISOString(),
            updatedAt: consultant.updatedAt.toISOString(),
          }
        : null,
    });
  }
}
