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
import type { InvoiceAggregate } from "../../../domain/invoice.aggregate";
import { isInvoiceListDeletionReason } from "../../../domain/invoice-list-visibility";

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

    const reason = input.reason?.trim() || null;
    const hideFromList = isInvoiceListDeletionReason(input.reason);
    const isCancellationComplete = (invoice: InvoiceAggregate) =>
      invoice.status === "CANCELED" &&
      (!hideFromList || (invoice.hiddenFromList ?? isInvoiceListDeletionReason(invoice.notes)));
    let invoice = await this.useCaseDeps.invoiceRepo.findById(workspaceId, input.invoiceId);
    if (!invoice) {
      return err(new NotFoundError("Invoice not found"));
    }

    for (let attempt = 0; ; attempt++) {
      if (isCancellationComplete(invoice)) {
        return ok({ invoice: toInvoiceDto(invoice) });
      }

      const currentInvoice = invoice;
      const expectedRevision = currentInvoice.revision;
      const previousStatus = currentInvoice.status;
      const wasCanceled = previousStatus === "CANCELED";
      const changedAt = this.useCaseDeps.clock.now();
      try {
        currentInvoice.cancel(changedAt, hideFromList);
      } catch (error) {
        return err(
          new ConflictError(error instanceof Error ? error.message : "Invoice cannot be canceled.")
        );
      }

      try {
        await this.useCaseDeps.unitOfWork.withinTransaction(async (tx) => {
          if (previousStatus !== "DRAFT" && !wasCanceled) {
            await this.useCaseDeps.accounting?.assertCorrectionAllowed(
              tenantId,
              currentInvoice.id,
              tx
            );
          }
          await this.useCaseDeps.invoiceRepo.save(workspaceId, currentInvoice, {
            expectedRevision,
            tx,
          });
          await this.useCaseDeps.audit.log(
            {
              tenantId,
              userId: ctx.userId ?? "system",
              action: wasCanceled ? "invoice.hidden_from_list" : "invoice.canceled",
              entityType: "Invoice",
              entityId: currentInvoice.id,
              metadata: {
                workspaceId,
                previousStatus,
                invoiceNumber: currentInvoice.number,
                ...(wasCanceled
                  ? { hiddenAt: changedAt.toISOString() }
                  : { canceledAt: changedAt.toISOString() }),
                reason,
                hiddenFromList: hideFromList,
              },
            },
            tx
          );
        });
        return ok({ invoice: toInvoiceDto(currentInvoice) });
      } catch (error) {
        if (error instanceof InvoiceChangedError) {
          const current = await this.useCaseDeps.invoiceRepo.findById(workspaceId, input.invoiceId);
          if (current && isCancellationComplete(current)) {
            return ok({ invoice: toInvoiceDto(current) });
          }
          if (attempt === 0 && current?.status === "CANCELED") {
            invoice = current;
            continue;
          }
        }
        throw error;
      }
    }
  }
}
