import {
  BaseUseCase,
  ConflictError,
  type IdGeneratorPort,
  type LoggerPort,
  NotFoundError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  buildIdempotencyKey,
  err,
  ok,
  RequireTenant,
  type ClockPort,
} from "@corely/kernel";
import { type SendInvoiceInput, type SendInvoiceOutput } from "@corely/contracts";
import { type InvoiceRepoPort } from "../../ports/invoice-repository.port";
import { type InvoiceEmailDeliveryRepoPort } from "../../ports/invoice-email-delivery-repository.port";
import { type OutboxPort } from "../../ports/outbox.port";
import { createHash } from "crypto";
import { type InvoiceReminderStatePort } from "../../ports/invoice-reminder-state.port";
import { type InvoiceReminderSettingsPort } from "../../ports/invoice-reminder-settings.port";
import { computeNextReminderAt } from "../../helpers/reminder-schedule";
import type { TenantTimeZonePort } from "@corely/kernel";
import type { AuditPort } from "@/shared/ports/audit.port";

type Deps = {
  logger: LoggerPort;
  invoiceRepo: InvoiceRepoPort;
  deliveryRepo: InvoiceEmailDeliveryRepoPort;
  outbox: OutboxPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  reminderState: InvoiceReminderStatePort;
  reminderSettings: InvoiceReminderSettingsPort;
  audit: AuditPort;
  tenantTimeZone: TenantTimeZonePort;
};

@RequireTenant()
export class SendInvoiceUseCase extends BaseUseCase<SendInvoiceInput, SendInvoiceOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: SendInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<SendInvoiceOutput, UseCaseError>> {
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId missing from context"));
    }

    // 1. Validate invoice exists + belongs to workspace
    const invoice = await this.useCaseDeps.invoiceRepo.findById(ctx.workspaceId, input.invoiceId);
    if (!invoice) {
      return err(new NotFoundError("Invoice not found"));
    }

    // 2. Confirm invoice is in a sendable state (ISSUED or SENT allowed, DRAFT not allowed)
    if (invoice.status === "DRAFT") {
      return err(new ConflictError("Cannot send a draft invoice. Please finalize it first."));
    }

    if (invoice.status === "CANCELED") {
      return err(new ConflictError("Cannot send a canceled invoice."));
    }

    // 3. Compute idempotency key
    const idempotencyKey =
      input.idempotencyKey ?? this.generateIdempotencyKey(input.invoiceId, input.to);

    // 4. Check for existing delivery (idempotency)
    const existingDelivery = await this.useCaseDeps.deliveryRepo.findByIdempotencyKey(
      ctx.workspaceId,
      idempotencyKey
    );

    if (existingDelivery) {
      // Already queued or sent
      await this.ensureSentAndReminderState(invoice, ctx);
      return ok({
        deliveryId: existingDelivery.id,
        status: existingDelivery.status,
      });
    }

    // 5. Create delivery record with status QUEUED
    const deliveryId = this.useCaseDeps.idGenerator.newId();
    await this.useCaseDeps.deliveryRepo.create({
      id: deliveryId,
      tenantId: ctx.workspaceId,
      invoiceId: input.invoiceId,
      to: input.to,
      status: "QUEUED",
      provider: process.env.EMAIL_PROVIDER ?? "resend",
      idempotencyKey,
    });

    // 6. Write outbox event
    const payload = {
      deliveryId,
      invoiceId: input.invoiceId,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: input.subject,
      message: input.message,
      attachPdf: input.attachPdf,
      locale: input.locale,
      idempotencyKey,
    };

    await this.useCaseDeps.outbox.enqueue({
      tenantId: ctx.workspaceId,
      eventType: "invoice.email.requested",
      payload,
      correlationId: ctx.correlationId,
    });

    await this.ensureSentAndReminderState(invoice, ctx);

    return ok({ deliveryId, status: "QUEUED" });
  }

  private async ensureSentAndReminderState(invoice: any, ctx: UseCaseContext) {
    const now = this.useCaseDeps.clock.now();
    if (invoice.status !== "SENT") {
      invoice.markSent(now, now);
      await this.useCaseDeps.invoiceRepo.save(ctx.workspaceId!, invoice);
    }

    const policy = await this.useCaseDeps.reminderSettings.getPolicy(
      ctx.tenantId,
      ctx.workspaceId!
    );
    if (policy.maxReminders > 0 && policy.startAfterDays > 0) {
      const existingState = await this.useCaseDeps.reminderState.findByInvoice(
        ctx.tenantId,
        invoice.id
      );
      if (existingState) {
        return;
      }
      const tenantTz =
        (await this.useCaseDeps.tenantTimeZone.getTenantTimeZone(ctx.tenantId)) ?? "UTC";
      const sentAt = invoice.sentAt ?? now;
      const nextReminderAt = await computeNextReminderAt({
        tenantTimeZone: tenantTz,
        baseInstant: sentAt,
        intervalDays: policy.startAfterDays,
        sendOnlyOnWeekdays: policy.sendOnlyOnWeekdays,
      });

      await this.useCaseDeps.reminderState.upsertInitialState({
        id: this.useCaseDeps.idGenerator.newId(),
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId!,
        invoiceId: invoice.id,
        nextReminderAt,
      });

      await this.useCaseDeps.audit.log({
        tenantId: ctx.tenantId,
        userId: ctx.userId ?? "system",
        action: "invoice.reminder.state.initialized",
        entityType: "Invoice",
        entityId: invoice.id,
        metadata: {
          nextReminderAt: nextReminderAt.toISOString(),
          startAfterDays: policy.startAfterDays,
          maxReminders: policy.maxReminders,
        },
      });
    }
  }

  private generateIdempotencyKey(invoiceId: string, to: string): string {
    const hash = createHash("sha256").update(to).digest("hex").slice(0, 16);
    return buildIdempotencyKey("invoice-send", invoiceId, hash);
  }
}
