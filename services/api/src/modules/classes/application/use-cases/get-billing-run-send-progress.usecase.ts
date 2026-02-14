import { NotFoundError } from "@corely/domain";
import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { BillingInvoiceSendProgressEvent } from "@corely/contracts";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { GetMonthlyBillingPreviewUseCase } from "./get-monthly-billing-preview.usecase";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";

@RequireTenant()
export class GetBillingRunSendProgressUseCase {
  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly getMonthlyBillingPreviewUseCase: GetMonthlyBillingPreviewUseCase
  ) {}

  async execute(
    input: { billingRunId: string },
    ctx: UseCaseContext
  ): Promise<BillingInvoiceSendProgressEvent> {
    assertCanClasses(ctx, "classes.billing");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const run = await this.repo.findBillingRunById(tenantId, workspaceId, input.billingRunId);
    if (!run) {
      throw new NotFoundError("Billing run not found", { code: "Classes:BillingRunNotFound" });
    }

    const preview = await this.getMonthlyBillingPreviewUseCase.execute({ month: run.month }, ctx);
    const progress = preview.invoiceSendProgress ?? null;
    const isComplete =
      progress?.isComplete ??
      (!preview.invoicesSentAt && (preview.invoiceLinks?.length ?? 0) === 0);

    return {
      billingRunId: run.id,
      month: run.month,
      progress,
      isComplete,
      generatedAt: preview.generatedAt.toISOString(),
    };
  }
}
