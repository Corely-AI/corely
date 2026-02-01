import { Injectable } from "@nestjs/common";
import type { ListTaxReportsOutput } from "@corely/contracts";
import { TaxStrategyResolverService } from "../services/tax-strategy-resolver.service";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";

export interface ListTaxReportsInput {
  status: "upcoming" | "submitted";
  group?: string | null;
  type?: string | null;
}

@RequireTenant()
@Injectable()
export class ListTaxReportsUseCase extends BaseUseCase<ListTaxReportsInput, ListTaxReportsOutput> {
  constructor(private readonly resolver: TaxStrategyResolverService) {
    super({ logger: null as any });
  }

  protected async handle(
    input: ListTaxReportsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListTaxReportsOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const strategy = await this.resolver.resolve(workspaceId);
    const reports = await strategy.listReports(
      { tenantId: ctx.tenantId!, workspaceId },
      input.status,
      { group: input.group, type: input.type }
    );
    return ok({ reports });
  }
}
