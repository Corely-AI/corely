import { ForbiddenException, Injectable, Inject } from "@nestjs/common";
import type { MarkVatPeriodSubmittedInput, MarkVatPeriodSubmittedOutput } from "@corely/contracts";
import { VatPeriodResolver } from "../../domain/services/vat-period.resolver";
import { TaxProfileRepoPort, TaxReportRepoPort, VatPeriodQueryPort } from "../../domain/ports";
import { VatAccountingMethod } from "@corely/contracts";
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

export interface MarkVatPeriodSubmittedInputWithKey extends MarkVatPeriodSubmittedInput {
  periodKey: string;
}

@RequireTenant()
@Injectable()
export class MarkVatPeriodSubmittedUseCase extends BaseUseCase<
  MarkVatPeriodSubmittedInputWithKey,
  MarkVatPeriodSubmittedOutput
> {
  constructor(
    private readonly periodResolver: VatPeriodResolver,
    private readonly vatPeriodQuery: VatPeriodQueryPort,
    private readonly taxProfileRepo: TaxProfileRepoPort,
    private readonly taxReportRepo: TaxReportRepoPort,
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    input: MarkVatPeriodSubmittedInputWithKey,
    ctx: UseCaseContext
  ): Promise<Result<MarkVatPeriodSubmittedOutput, UseCaseError>> {
    await this.assertWorkspaceAdmin(ctx);
    const period = this.periodResolver.resolveQuarter(input.periodKey);
    const now = new Date();
    const workspaceId = ctx.workspaceId || ctx.tenantId!;

    const profile = await this.taxProfileRepo.getActive(workspaceId, now);
    const method = profile?.vatAccountingMethod ?? "IST";

    const inputs = await this.vatPeriodQuery.getInputs(
      workspaceId,
      period.start,
      period.end,
      method as VatAccountingMethod
    );

    const taxDueCents = inputs.salesVatCents - inputs.purchaseVatCents;
    const dueDate = this.calculateDueDate(period.end);
    const submittedAt = input.submissionDate ? new Date(input.submissionDate) : now;

    const report = await this.taxReportRepo.upsertByPeriod({
      tenantId: workspaceId,
      type: "VAT_ADVANCE",
      group: "ADVANCE_VAT",
      periodLabel: period.label,
      periodStart: period.start,
      periodEnd: period.end,
      dueDate,
      status: "SUBMITTED",
      amountFinalCents: taxDueCents,
      submittedAt,
      submissionReference: input.reference ?? null,
      submissionNotes: input.notes ?? null,
      archivedReason: null,
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
