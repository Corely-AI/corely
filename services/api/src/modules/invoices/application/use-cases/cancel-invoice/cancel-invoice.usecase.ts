import {
  err,
  BaseUseCase,
  type AuditPort,
  type ClockPort,
  ConflictError,
  type LoggerPort,
  NotFoundError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  type UnitOfWorkPort,
  type TransactionContext,
  ValidationError,
  RequireTenant,
  ok,
} from "@corely/kernel";
import type { CancelInvoiceInput, CancelInvoiceOutput } from "@corely/contracts";
import { toInvoiceDto } from "../shared/invoice-dto.mapper";
import { InvoiceChangedError, type InvoiceRepoPort } from "../../ports/invoice-repository.port";

type Deps = {
  logger: LoggerPort;
  invoiceRepo: InvoiceRepoPort;
  clock: ClockPort;
  audit: AuditPort;
  unitOfWork: UnitOfWorkPort;
  accounting?: {
    assertCorrectionAllowed(
      tenantId: string,
      invoiceId: string,
      tx: TransactionContext
    ): Promise<void>;
  };
};

@RequireTenant()
export class CancelInvoiceUseCase extends BaseUseCase<CancelInvoiceInput, CancelInvoiceOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: CancelInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<CancelInvoiceOutput, UseCaseError>> {
    const { workspaceId, tenantId } = ctx;
    if (!workspaceId || !tenantId) {
      return err(new ValidationError("Tenant and workspace context are required"));
    }

    const invoice = await this.useCaseDeps.invoiceRepo.findById(workspaceId, input.invoiceId);
    if (!invoice) {
      return err(new NotFoundError("Invoice not found"));
    }

    if (invoice.status === "CANCELED") {
      return ok({ invoice: toInvoiceDto(invoice) });
    }

    const expectedRevision = invoice.revision;
    const previousStatus = invoice.status;
    const canceledAt = this.useCaseDeps.clock.now();
    try {
      invoice.cancel(canceledAt);
    } catch (error) {
      return err(new ConflictError((error as Error).message));
    }

    try {
      await this.useCaseDeps.unitOfWork.withinTransaction(async (tx) => {
        if (previousStatus !== "DRAFT") {
          await this.useCaseDeps.accounting?.assertCorrectionAllowed(tenantId, invoice.id, tx);
        }
        await this.useCaseDeps.invoiceRepo.save(workspaceId, invoice, { expectedRevision, tx });
        await this.useCaseDeps.audit.log(
          {
            tenantId,
            userId: ctx.userId ?? "system",
            action: "invoice.canceled",
            entityType: "Invoice",
            entityId: invoice.id,
            metadata: {
              workspaceId,
              previousStatus,
              invoiceNumber: invoice.number,
              canceledAt: canceledAt.toISOString(),
              reason: input.reason?.trim() || null,
            },
          },
          tx
        );
      });
    } catch (error) {
      if (error instanceof InvoiceChangedError) {
        const current = await this.useCaseDeps.invoiceRepo.findById(workspaceId, invoice.id);
        if (current?.status === "CANCELED") {
          return ok({ invoice: toInvoiceDto(current) });
        }
      }
      throw error;
    }
    return ok({ invoice: toInvoiceDto(invoice) });
  }
}
