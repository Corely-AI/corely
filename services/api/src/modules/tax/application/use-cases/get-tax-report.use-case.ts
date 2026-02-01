import { Injectable } from "@nestjs/common";
import { TaxReportRepoPort } from "../../domain/ports/tax-report-repo.port";
import { type TaxReportDto } from "@corely/contracts";
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
export class GetTaxReportUseCase extends BaseUseCase<string, TaxReportDto | null> {
  constructor(private readonly repo: TaxReportRepoPort) {
    super({ logger: null as any });
  }

  protected async handle(
    id: string,
    ctx: UseCaseContext
  ): Promise<Result<TaxReportDto | null, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    const workspaceId = ctx.workspaceId || tenantId;
    const entity = await this.repo.findById(workspaceId, id);
    if (!entity) {
      return ok(null);
    }

    return ok({
      id: entity.id,
      tenantId: entity.tenantId,
      type: entity.type,
      group: entity.group,
      periodLabel: entity.periodLabel,
      periodStart: entity.periodStart.toISOString(),
      periodEnd: entity.periodEnd.toISOString(),
      dueDate: entity.dueDate.toISOString(),
      status: entity.status,
      amountEstimatedCents: entity.amountEstimatedCents,
      amountFinalCents: entity.amountFinalCents,
      currency: entity.currency,
      submittedAt: entity.submittedAt?.toISOString(),
      submissionReference: entity.submissionReference,
      submissionNotes: entity.submissionNotes,
      archivedReason: entity.archivedReason,
      pdfStorageKey: entity.pdfStorageKey,
      pdfGeneratedAt: entity.pdfGeneratedAt?.toISOString(),
      meta: entity.meta,
      lines: entity.lines?.map((l) => ({
        section: l.section,
        label: l.label,
        netAmountCents: l.netAmountCents,
        taxAmountCents: l.taxAmountCents,
        meta: l.meta,
      })),
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    });
  }
}
