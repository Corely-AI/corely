import {
  BaseUseCase,
  type ClockPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  err,
  isErr,
  ok,
  RequireTenant,
  ValidationError,
  type IdGeneratorPort,
  type TenantTimeZonePort,
} from "@corely/kernel";
import type { RunInvoiceRemindersInput, RunInvoiceRemindersOutput } from "@corely/contracts";
import type { InvoiceRepoPort } from "../../ports/invoice-repository.port";
import type { SendInvoiceUseCase } from "../send-invoice/send-invoice.usecase";
import type { InvoiceReminderStatePort, InvoiceReminderSettingsPort } from "@corely/kernel";
import { computeNextReminderAt } from "../../helpers/reminder-schedule";
import type { AuditPort } from "@/shared/ports/audit.port";

type Deps = {
  logger: LoggerPort;
  invoiceRepo: InvoiceRepoPort;
  sendInvoice: SendInvoiceUseCase;
  clock: ClockPort;
  reminderState: InvoiceReminderStatePort;
  reminderSettings: InvoiceReminderSettingsPort;
  idGenerator: IdGeneratorPort;
  audit: AuditPort;
  tenantTimeZone: TenantTimeZonePort;
};

@RequireTenant()
export class SendInvoiceRemindersUseCase extends BaseUseCase<
  RunInvoiceRemindersInput,
  RunInvoiceRemindersOutput
> {
  constructor(private readonly reminderDeps: Deps) {
    super({ logger: reminderDeps.logger });
  }

  protected async handle(
    input: RunInvoiceRemindersInput,
    ctx: UseCaseContext
  ): Promise<Result<RunInvoiceRemindersOutput, UseCaseError>> {
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId missing from context"));
    }

    const policy = await this.reminderDeps.reminderSettings.getPolicy(
      ctx.tenantId,
      ctx.workspaceId
    );
    if (policy.maxReminders <= 0 || policy.startAfterDays <= 0) {
      return ok({ processed: 0, sent: 0, skipped: 0 });
    }

    const now = this.reminderDeps.clock.now();
    const tenantTz =
      (await this.reminderDeps.tenantTimeZone.getTenantTimeZone(ctx.tenantId)) ?? "UTC";
    const limit = input.limit ?? 100;
    const lockId = this.reminderDeps.idGenerator.newId();

    const candidates = await this.reminderDeps.reminderState.claimDueReminders(
      ctx.tenantId,
      ctx.workspaceId,
      now,
      { limit, lockId, lockTtlMs: 5 * 60_000 }
    );

    let sent = 0;
    let skipped = 0;

    for (const invoice of candidates) {
      if (!invoice.nextReminderAt) {
        await this.reminderDeps.reminderState.markStopped({
          tenantId: ctx.tenantId,
          reminderId: invoice.id,
          lockId,
        });
        skipped += 1;
        continue;
      }

      if (invoice.remindersSent >= policy.maxReminders) {
        await this.reminderDeps.reminderState.markStopped({
          tenantId: ctx.tenantId,
          reminderId: invoice.id,
          lockId,
        });
        skipped += 1;
        continue;
      }

      const fullInvoice = await this.reminderDeps.invoiceRepo.findById(
        ctx.workspaceId,
        invoice.invoiceId
      );

      if (!fullInvoice || fullInvoice.status === "PAID" || fullInvoice.status === "CANCELED") {
        await this.reminderDeps.reminderState.markStopped({
          tenantId: ctx.tenantId,
          reminderId: invoice.id,
          lockId,
        });
        skipped += 1;
        continue;
      }

      if (!fullInvoice.billToEmail) {
        await this.reminderDeps.reminderState.releaseLock(ctx.tenantId, invoice.id, lockId);
        skipped += 1;
        continue;
      }

      const message = fullInvoice.number
        ? `Friendly reminder: Invoice ${fullInvoice.number} is still outstanding.`
        : "Friendly reminder: Your invoice is still outstanding.";

      const result = await this.reminderDeps.sendInvoice.execute(
        {
          invoiceId: fullInvoice.id,
          to: fullInvoice.billToEmail,
          message,
          attachPdf: true,
          idempotencyKey: `invoice-reminder/${invoice.id}/${invoice.remindersSent + 1}`,
        },
        ctx
      );

      if (isErr(result)) {
        this.reminderDeps.logger.warn(
          `Invoice reminder failed for ${invoice.invoiceId}: ${result.error.message}`
        );
        await this.reminderDeps.reminderState.releaseLock(ctx.tenantId, invoice.id, lockId);
        continue;
      }

      const nextReminderAt =
        invoice.remindersSent + 1 >= policy.maxReminders
          ? null
          : await computeNextReminderAt({
              tenantTimeZone: tenantTz,
              baseInstant: now,
              intervalDays: policy.startAfterDays,
              sendOnlyOnWeekdays: policy.sendOnlyOnWeekdays,
            });

      await this.reminderDeps.reminderState.markReminderSent({
        tenantId: ctx.tenantId,
        reminderId: invoice.id,
        lockId,
        remindersSent: invoice.remindersSent + 1,
        lastReminderAt: now,
        nextReminderAt,
      });

      await this.reminderDeps.audit.log({
        tenantId: ctx.tenantId,
        userId: ctx.userId ?? "system",
        action: "invoice.reminder.sent",
        entityType: "Invoice",
        entityId: fullInvoice.id,
        metadata: {
          reminderCount: invoice.remindersSent + 1,
          nextReminderAt: nextReminderAt ? nextReminderAt.toISOString() : null,
        },
      });

      sent += 1;
    }

    this.reminderDeps.logger.info(
      `Invoice reminders processed=${candidates.length} sent=${sent} skipped=${skipped}`
    );
    return ok({ processed: candidates.length, sent, skipped });
  }
}
