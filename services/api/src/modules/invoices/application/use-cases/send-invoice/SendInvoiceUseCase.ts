import {
  BaseUseCase,
  ConflictError,
  LoggerPort,
  NotFoundError,
  Result,
  UseCaseContext,
  UseCaseError,
  ValidationError,
  err,
  ok,
} from "@kerniflow/kernel";
import { SendInvoiceInput, SendInvoiceOutput } from "@kerniflow/contracts";
import { InvoiceRepoPort } from "../../ports/invoice-repo.port";
import { NotificationPort } from "../../ports/notification.port";
import { toInvoiceDto } from "../shared/invoice-dto.mapper";

type Deps = {
  logger: LoggerPort;
  invoiceRepo: InvoiceRepoPort;
  notification: NotificationPort;
};

export class SendInvoiceUseCase extends BaseUseCase<SendInvoiceInput, SendInvoiceOutput> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: SendInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<SendInvoiceOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const invoice = await this.deps.invoiceRepo.findById(ctx.tenantId, input.invoiceId);
    if (!invoice) {
      return err(new NotFoundError("Invoice not found"));
    }

    try {
      invoice.markSent(new Date());
    } catch (error) {
      return err(new ConflictError((error as Error).message));
    }

    await this.deps.notification.sendInvoiceEmail(ctx.tenantId, {
      invoiceId: invoice.id,
      to: input.emailTo,
    });

    await this.deps.invoiceRepo.save(ctx.tenantId, invoice);
    return ok({ invoice: toInvoiceDto(invoice) });
  }
}
