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
} from "@corely/kernel";
import type { RunInvoiceRemindersInput, RunInvoiceRemindersOutput } from "@corely/contracts";
import type { InvoiceRepoPort } from "../../ports/invoice-repository.port";
import type { SendInvoiceUseCase } from "../send-invoice/send-invoice.usecase";

type Deps = {
  logger: LoggerPort;
  invoiceRepo: InvoiceRepoPort;
  sendInvoice: SendInvoiceUseCase;
  clock: ClockPort;
};

@RequireTenant()
export class SendInvoiceRemindersUseCase extends BaseUseCase<
  RunInvoiceRemindersInput,
  RunInvoiceRemindersOutput
> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: RunInvoiceRemindersInput,
    ctx: UseCaseContext
  ): Promise<Result<RunInvoiceRemindersOutput, UseCaseError>> {
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId missing from context"));
    }

    const daysOverdue = input.daysOverdue ?? 7;
    const cutoff = new Date(this.deps.clock.now().getTime() - daysOverdue * 86_400_000);

    const candidates = await this.deps.invoiceRepo.listReminderCandidates(ctx.workspaceId, cutoff);

    let sent = 0;
    let skipped = 0;

    for (const invoice of candidates) {
      if (!invoice.billToEmail) {
        skipped += 1;
        continue;
      }

      const message = invoice.number
        ? `Friendly reminder: Invoice ${invoice.number} is still outstanding.`
        : "Friendly reminder: Your invoice is still outstanding.";

      const result = await this.deps.sendInvoice.execute(
        {
          invoiceId: invoice.id,
          to: invoice.billToEmail,
          message,
          attachPdf: true,
          idempotencyKey: `invoice-reminder/${invoice.id}`,
        },
        ctx
      );

      if (isErr(result)) {
        this.deps.logger.warn(`Invoice reminder failed for ${invoice.id}: ${result.error.message}`);
        continue;
      }

      sent += 1;
    }

    return ok({ processed: candidates.length, sent, skipped });
  }
}
