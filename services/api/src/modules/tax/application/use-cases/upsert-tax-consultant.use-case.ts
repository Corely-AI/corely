import { Injectable } from "@nestjs/common";
import type { UpsertTaxConsultantInput, UpsertTaxConsultantOutput } from "@corely/contracts";
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
export class UpsertTaxConsultantUseCase extends BaseUseCase<
  UpsertTaxConsultantInput,
  UpsertTaxConsultantOutput
> {
  constructor(private readonly repo: TaxConsultantRepoPort) {
    super({ logger: null as any });
  }

  protected async handle(
    input: UpsertTaxConsultantInput,
    ctx: UseCaseContext
  ): Promise<Result<UpsertTaxConsultantOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const consultant = await this.repo.upsert(workspaceId, {
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
    });

    return ok({
      consultant: {
        id: consultant.id,
        tenantId: consultant.tenantId,
        name: consultant.name,
        email: consultant.email ?? null,
        phone: consultant.phone ?? null,
        notes: consultant.notes ?? null,
        createdAt: consultant.createdAt.toISOString(),
        updatedAt: consultant.updatedAt.toISOString(),
      },
    });
  }
}
