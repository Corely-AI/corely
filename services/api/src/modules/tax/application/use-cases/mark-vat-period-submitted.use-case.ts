import { ForbiddenException, Injectable } from "@nestjs/common";
import type { MarkVatPeriodSubmittedInput, MarkVatPeriodSubmittedOutput } from "@corely/contracts";
import { VatPeriodResolver } from "../../domain/services/vat-period.resolver";
import { TaxProfileRepoPort, TaxReportRepoPort, VatPeriodQueryPort } from "../../domain/ports";
import type { UseCaseContext } from "./use-case-context";
import { VatAccountingMethod } from "@corely/contracts";
import {
  WORKSPACE_REPOSITORY_PORT,
  type WorkspaceRepositoryPort,
} from "../../../workspaces/application/ports/workspace-repository.port";
import { Inject } from "@nestjs/common";
import { mapTaxReportToDto } from "../mappers/tax-report-dto.mapper";

@Injectable()
export class MarkVatPeriodSubmittedUseCase {
  constructor(
    private readonly periodResolver: VatPeriodResolver,
    private readonly vatPeriodQuery: VatPeriodQueryPort,
    private readonly taxProfileRepo: TaxProfileRepoPort,
    private readonly taxReportRepo: TaxReportRepoPort,
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort
  ) {}

  async execute(
    periodKey: string,
    input: MarkVatPeriodSubmittedInput,
    ctx: UseCaseContext
  ): Promise<MarkVatPeriodSubmittedOutput> {
    await this.assertWorkspaceAdmin(ctx);
    const period = this.periodResolver.resolveQuarter(periodKey);
    const now = new Date();

    const profile = await this.taxProfileRepo.getActive(ctx.workspaceId, now);
    const method = profile?.vatAccountingMethod ?? "IST";

    const inputs = await this.vatPeriodQuery.getInputs(
      ctx.workspaceId,
      period.start,
      period.end,
      method as VatAccountingMethod
    );

    const taxDueCents = inputs.salesVatCents - inputs.purchaseVatCents;
    const dueDate = this.calculateDueDate(period.end);
    const submittedAt = input.submissionDate ? new Date(input.submissionDate) : now;

    const report = await this.taxReportRepo.upsertByPeriod({
      tenantId: ctx.workspaceId,
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

    return { report: mapTaxReportToDto(report) };
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
      ctx.tenantId,
      ctx.workspaceId,
      ctx.userId
    );
    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this workspace");
    }

    const membership = await this.workspaceRepo.getMembershipByUserAndWorkspace(
      ctx.workspaceId,
      ctx.userId
    );
    const isAdmin = membership?.role === "OWNER" || membership?.role === "ADMIN";
    if (!isAdmin) {
      throw new ForbiddenException("Only workspace admins can update VAT periods");
    }
  }
}
