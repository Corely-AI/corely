import { ForbiddenException, Injectable, Inject } from "@nestjs/common";
import type { ArchiveVatPeriodInput, ArchiveVatPeriodOutput } from "@corely/contracts";
import { VatPeriodResolver } from "../../domain/services/vat-period.resolver";
import { TaxReportRepoPort } from "../../domain/ports";
import {
  WORKSPACE_REPOSITORY_PORT,
  type WorkspaceRepositoryPort,
} from "../../../workspaces/application/ports/workspace-repository.port";
import { mapTaxReportToDto } from "../mappers/tax-report-dto.mapper";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";

export interface ArchiveVatPeriodInputWithKey extends ArchiveVatPeriodInput {
  periodKey: string;
}

@RequireTenant()
@Injectable()
export class ArchiveVatPeriodUseCase extends BaseUseCase<
  ArchiveVatPeriodInputWithKey,
  ArchiveVatPeriodOutput
> {
  constructor(
    private readonly periodResolver: VatPeriodResolver,
    private readonly taxReportRepo: TaxReportRepoPort,
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    input: ArchiveVatPeriodInputWithKey,
    ctx: UseCaseContext
  ): Promise<Result<ArchiveVatPeriodOutput, UseCaseError>> {
    await this.assertWorkspaceAdmin(ctx);
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const period = this.periodResolver.resolveQuarter(input.periodKey);
    const dueDate = this.calculateDueDate(period.end);

    const report = await this.taxReportRepo.upsertByPeriod({
      tenantId: workspaceId,
      type: "VAT_ADVANCE",
      group: "ADVANCE_VAT",
      periodLabel: period.label,
      periodStart: period.start,
      periodEnd: period.end,
      dueDate,
      status: "ARCHIVED",
      amountFinalCents: null,
      submittedAt: new Date(),
      submissionReference: null,
      submissionNotes: input.notes ?? null,
      archivedReason: input.reason,
    });

    return ok({ report: mapTaxReportToDto(report) });
  }

  private calculateDueDate(periodEnd: Date) {
    const dueDate = new Date(
      Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth(), periodEnd.getUTCDate())
    );
    dueDate.setUTCDate(dueDate.getUTCDate() + 9);
    return dueDate;
  }

  private async assertWorkspaceAdmin(ctx: UseCaseContext) {
    const hasAccess = await this.workspaceRepo.checkUserHasWorkspaceAccess(
      ctx.tenantId!,
      ctx.workspaceId || ctx.tenantId!,
      ctx.userId!
    );
    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this workspace");
    }

    const membership = await this.workspaceRepo.getMembershipByUserAndWorkspace(
      ctx.workspaceId || ctx.tenantId!,
      ctx.userId!
    );
    const isAdmin = membership?.role === "OWNER" || membership?.role === "ADMIN";
    if (!isAdmin) {
      throw new ForbiddenException("Only workspace admins can update VAT periods");
    }
  }
}
