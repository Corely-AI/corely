import { ForbiddenException, Injectable } from "@nestjs/common";
import type { MarkVatPeriodNilInput, MarkVatPeriodNilOutput } from "@corely/contracts";
import { VatPeriodResolver } from "../../domain/services/vat-period.resolver";
import { TaxReportRepoPort } from "../../domain/ports";
import type { UseCaseContext } from "./use-case-context";
import {
  WORKSPACE_REPOSITORY_PORT,
  type WorkspaceRepositoryPort,
} from "../../../workspaces/application/ports/workspace-repository.port";
import { Inject } from "@nestjs/common";
import { mapTaxReportToDto } from "../mappers/tax-report-dto.mapper";

@Injectable()
export class MarkVatPeriodNilUseCase {
  constructor(
    private readonly periodResolver: VatPeriodResolver,
    private readonly taxReportRepo: TaxReportRepoPort,
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort
  ) {}

  async execute(
    periodKey: string,
    input: MarkVatPeriodNilInput,
    ctx: UseCaseContext
  ): Promise<MarkVatPeriodNilOutput> {
    await this.assertWorkspaceAdmin(ctx);
    const period = this.periodResolver.resolveQuarter(periodKey);
    const submittedAt = input.submissionDate ? new Date(input.submissionDate) : new Date();
    const dueDate = this.calculateDueDate(period.end);

    const report = await this.taxReportRepo.upsertByPeriod({
      tenantId: ctx.workspaceId,
      type: "VAT_ADVANCE",
      group: "ADVANCE_VAT",
      periodLabel: period.label,
      periodStart: period.start,
      periodEnd: period.end,
      dueDate,
      status: "NIL",
      amountFinalCents: 0,
      submittedAt,
      submissionReference: null,
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
