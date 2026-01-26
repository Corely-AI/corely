import {
  err,
  BaseUseCase,
  type ClockPort,
  ConflictError,
  type LoggerPort,
  NotFoundError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ok,
} from "@corely/kernel";
import type { CancelInvoiceInput, CancelInvoiceOutput } from "@corely/contracts";
import { toInvoiceDto } from "../shared/invoice-dto.mapper";
import type { InvoiceRepoPort } from "../../ports/invoice-repository.port";

type Deps = {
  logger: LoggerPort;
  invoiceRepo: InvoiceRepoPort;
  clock: ClockPort;
};

export class CancelInvoiceUseCase extends BaseUseCase<CancelInvoiceInput, CancelInvoiceOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: CancelInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<CancelInvoiceOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId missing from context"));
    }

    const invoice = await this.useCaseDeps.invoiceRepo.findById(ctx.workspaceId, input.invoiceId);
    if (!invoice) {
      return err(new NotFoundError("Invoice not found"));
    }

    try {
      const now = this.useCaseDeps.clock.now();
      invoice.cancel(input.reason, now, now);
    } catch (error) {
      return err(new ConflictError((error as Error).message));
    }

    await this.useCaseDeps.invoiceRepo.save(ctx.workspaceId, invoice);
    return ok({ invoice: toInvoiceDto(invoice) });
  }
}
