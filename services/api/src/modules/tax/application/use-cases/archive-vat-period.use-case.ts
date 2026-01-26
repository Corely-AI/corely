import { ForbiddenException, Injectable } from "@nestjs/common";
import type { ArchiveVatPeriodInput, ArchiveVatPeriodOutput } from "@corely/contracts";
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
export class ArchiveVatPeriodUseCase {
  constructor(
    private readonly periodResolver: VatPeriodResolver,
    private readonly taxReportRepo: TaxReportRepoPort,
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort
  ) {}

  async execute(
    periodKey: string,
    input: ArchiveVatPeriodInput,
    ctx: UseCaseContext
  ): Promise<ArchiveVatPeriodOutput> {
    await this.assertWorkspaceAdmin(ctx);
    const period = this.periodResolver.resolveQuarter(periodKey);
    const dueDate = this.calculateDueDate(period.end);

    const report = await this.taxReportRepo.upsertByPeriod({
      tenantId: ctx.workspaceId,
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
