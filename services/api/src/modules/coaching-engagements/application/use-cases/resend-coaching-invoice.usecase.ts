import {
  BaseUseCase,
  ForbiddenError,
  ValidationError,
  isErr,
  type AuditPort,
  type ClockPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  err,
  ok,
} from "@corely/kernel";
import {
  type ResendCoachingInvoiceInput,
  type ResendCoachingInvoiceOutput,
} from "@corely/contracts";
import type { InvoicesApplication } from "../../../invoices/application/invoices.application";
import { canManageEngagement } from "../../domain/coaching-state.machine";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";

export class ResendCoachingInvoiceUseCase extends BaseUseCase<
  ResendCoachingInvoiceInput,
  ResendCoachingInvoiceOutput
> {
  constructor(
    private readonly deps: {
      logger: LoggerPort;
      repo: CoachingEngagementRepositoryPort;
      invoices: InvoicesApplication;
      clock: ClockPort;
      audit: AuditPort;
    }
  ) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ResendCoachingInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<ResendCoachingInvoiceOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId and workspaceId are required"));
    }

    const engagement = await this.deps.repo.findEngagementById(
      ctx.tenantId,
      ctx.workspaceId,
      input.engagementId
    );
    if (!engagement) {
      return err(new ValidationError("Engagement not found"));
    }
    if (!canManageEngagement(engagement, { userId: ctx.userId, roles: ctx.roles })) {
      return err(new ForbiddenError("Not authorized to manage this engagement"));
    }
    if (!engagement.invoiceId) {
      return err(new ValidationError("Invoice has not been generated yet"));
    }

    const invoiceResult = await this.deps.invoices.getInvoiceById.execute(
      { invoiceId: engagement.invoiceId },
      ctx
    );
    if (isErr(invoiceResult)) {
      return invoiceResult;
    }

    const invoice = invoiceResult.value.invoice;
    const to = input.to ?? invoice.billToEmail ?? undefined;
    if (!to) {
      return err(new ValidationError("Invoice recipient email is missing"));
    }

    const sent = await this.deps.invoices.sendInvoice.execute(
      {
        invoiceId: invoice.id,
        to,
        attachPdf: true,
        locale: engagement.locale,
        idempotencyKey: `coaching-invoice-resend:${engagement.id}:${this.deps.clock.now().toISOString()}`,
      },
      ctx
    );
    if (isErr(sent)) {
      return sent;
    }

    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "coaching.invoice.resent",
      entityType: "Invoice",
      entityId: invoice.id,
      metadata: {
        engagementId: engagement.id,
        to,
      },
    });

    return ok({
      invoiceId: invoice.id,
      deliveryId: sent.value.deliveryId,
      status: sent.value.status,
      to,
    });
  }
}
