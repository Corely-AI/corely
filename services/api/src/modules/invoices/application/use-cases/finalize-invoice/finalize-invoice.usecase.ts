import {
  BaseUseCase,
  type AuditPort,
  type ClockPort,
  ConflictError,
  type LoggerPort,
  NotFoundError,
  type Result,
  type TransactionContext,
  type UnitOfWorkPort,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import {
  invoiceFinalizationRejection,
  type InvoiceFinalizationRegistration,
} from "@corely/invoices/extensions";
import { validateInvoiceDraft } from "@corely/invoices";
import type { FinalizeInvoiceInput, FinalizeInvoiceOutput } from "@corely/contracts";
import { TaxJurisdictionUnsupportedError, TaxProfileMissingError } from "@corely/domain";
import {
  InvoiceChangedError,
  InvoiceNumberConflictError,
  type InvoiceRepoPort,
} from "../../ports/invoice-repository.port";
import type { InvoiceNumberingPort } from "../../ports/invoice-numbering.port";
import type { CustomerQueryPort } from "../../ports/customer-query.port";
import type { PaymentMethodQueryPort } from "../../ports/payment-method-query.port";
import type { TaxEngineService } from "../../../../tax/application/services/tax-engine.service";
import type { InvoiceAggregate } from "../../../domain/invoice.aggregate";
import {
  validateInvoiceCurrency,
  validateIssuableInvoiceLineAmounts,
} from "../../../domain/invoice-money";
import { toInvoiceDto } from "../shared/invoice-dto.mapper";

const numberingAttempts = 6;

type Deps = {
  logger: LoggerPort;
  invoiceRepo: InvoiceRepoPort;
  numbering: InvoiceNumberingPort;
  clock: ClockPort;
  customerQuery: CustomerQueryPort;
  paymentMethodQuery: PaymentMethodQueryPort;
  taxEngine: Pick<TaxEngineService, "calculate">;
  unitOfWork: UnitOfWorkPort;
  audit: AuditPort;
  accounting?: {
    assertCorrectionAllowed(
      tenantId: string,
      invoiceId: string,
      tx: TransactionContext
    ): Promise<void>;
    postForInvoice(
      invoice: InvoiceAggregate,
      ctx: UseCaseContext,
      tx: TransactionContext
    ): Promise<void>;
  };
  policies?: readonly InvoiceFinalizationRegistration[];
};

@RequireTenant()
export class FinalizeInvoiceUseCase extends BaseUseCase<
  FinalizeInvoiceInput,
  FinalizeInvoiceOutput
> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: FinalizeInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<FinalizeInvoiceOutput, UseCaseError>> {
    const { workspaceId, tenantId } = ctx;
    if (!workspaceId || !tenantId) {
      return err(new ValidationError("Tenant and workspace context are required"));
    }

    const { invoiceRepo, customerQuery, paymentMethodQuery, taxEngine, clock, numbering } =
      this.useCaseDeps;
    const invoice = await invoiceRepo.findById(workspaceId, input.invoiceId);
    if (!invoice) {
      return err(new NotFoundError("Invoice not found"));
    }
    if (invoice.status === "CANCELED") {
      return err(new ConflictError("Cannot finalize a canceled invoice."));
    }
    if (invoice.status !== "DRAFT") {
      return ok({ invoice: toInvoiceDto(invoice) });
    }
    const expectedRevision = invoice.revision;
    const rejection = invoiceFinalizationRejection(
      this.useCaseDeps.policies ?? [],
      { tenantId, workspaceId },
      { dueDate: invoice.dueDate }
    );
    if (rejection) {
      return err(new ValidationError(rejection, undefined, "Invoices:FinalizationPolicyRejected"));
    }

    validateInvoiceCurrency(invoice.currency);
    validateIssuableInvoiceLineAmounts(invoice.lineItems);
    const customer = await customerQuery.getCustomerBillingSnapshot(
      tenantId,
      invoice.customerPartyId
    );
    if (!customer) {
      return err(new NotFoundError("Customer not found"));
    }
    try {
      validateInvoiceDraft(invoice, customer.displayName);
    } catch (error) {
      return err(
        new ValidationError(error instanceof Error ? error.message : "Invalid invoice draft")
      );
    }

    const now = clock.now();
    const documentDate = invoice.invoiceDate
      ? `${invoice.invoiceDate}T00:00:00.000Z`
      : now.toISOString();
    const buyerCountry = customer.billingAddress?.country;
    if (!buyerCountry && customer.vatId) {
      return err(
        new ValidationError("Add the customer's billing country before issuing this invoice.")
      );
    }
    try {
      const tax = await taxEngine.calculate(
        {
          jurisdiction: invoice.issuerSnapshot?.address?.country ?? "",
          documentDate,
          currency: invoice.currency,
          customer: buyerCountry
            ? { country: buyerCountry, isBusiness: !!customer.vatId, vatId: customer.vatId }
            : undefined,
          lines: invoice.lineItems.map((line) => ({
            id: line.id,
            description: line.description,
            qty: line.qty,
            netAmountCents: line.qty * line.unitPriceCents,
          })),
        },
        tenantId,
        { invoiceIssuance: true }
      );

      if (
        tax.subtotalAmountCents !== invoice.totals.subtotalCents ||
        tax.totalAmountCents !== tax.subtotalAmountCents + tax.taxTotalAmountCents ||
        !Number.isSafeInteger(tax.taxTotalAmountCents) ||
        tax.taxTotalAmountCents < 0 ||
        !Number.isSafeInteger(tax.totalAmountCents)
      ) {
        return err(new ValidationError("Tax calculation returned invalid invoice totals."));
      }
      const { packId: _packId, ...taxSnapshot } = tax;
      invoice.updateSnapshots(
        { taxSnapshot: { ...taxSnapshot, appliedAt: now.toISOString() } },
        now
      );
    } catch (error) {
      if (
        error instanceof TaxProfileMissingError ||
        error instanceof TaxJurisdictionUnsupportedError
      ) {
        return err(
          new ValidationError(error.publicMessage ?? "Invoice tax configuration is unavailable.")
        );
      }
      throw error;
    }
    const explicitPaymentMethodId = input.paymentMethodId?.trim() || undefined;
    const paymentMethodId = explicitPaymentMethodId ?? (invoice.paymentMethodId || undefined);
    const paymentSnapshot = await paymentMethodQuery.getPaymentMethodSnapshot(
      tenantId,
      paymentMethodId
    );
    if (explicitPaymentMethodId && !paymentSnapshot) {
      return err(new ValidationError("The selected invoice payment method is unavailable."));
    }
    if (paymentSnapshot) {
      invoice.updateSnapshots({ paymentMethodId, paymentSnapshot }, now);
    }
    const firstNumber = await numbering.nextInvoiceNumber(workspaceId, now);
    invoice.finalize(firstNumber, now, now, {
      name: customer.displayName,
      email: customer.email ?? null,
      vatId: customer.vatId ?? null,
      address: customer.billingAddress?.line1
        ? {
            ...customer.billingAddress,
            line1: customer.billingAddress.line1,
          }
        : undefined,
    });

    for (let attempt = 0; attempt < numberingAttempts; attempt++) {
      if (attempt > 0) {
        // The previous number was never committed. Replace it without reapplying the transition.
        invoice.number = await numbering.nextInvoiceNumber(workspaceId, now);
      }
      try {
        await this.useCaseDeps.unitOfWork.withinTransaction(async (tx) => {
          if (invoice.sourceType === "invoice_correction" && invoice.sourceId) {
            await this.useCaseDeps.accounting?.assertCorrectionAllowed(
              tenantId,
              invoice.sourceId,
              tx
            );
          }
          await invoiceRepo.save(workspaceId, invoice, { expectedRevision, tx });
          await this.useCaseDeps.accounting?.postForInvoice(invoice, ctx, tx);
          await this.useCaseDeps.audit.log(
            {
              tenantId,
              userId: ctx.userId ?? "system",
              action: "invoice.issued",
              entityType: "Invoice",
              entityId: invoice.id,
              metadata: {
                workspaceId,
                number: invoice.number,
                sourceType: invoice.sourceType,
                sourceId: invoice.sourceId,
              },
            },
            tx
          );
        });
        return ok({ invoice: toInvoiceDto(invoice) });
      } catch (error) {
        if (error instanceof InvoiceChangedError) {
          const current = await invoiceRepo.findById(workspaceId, invoice.id);
          if (current?.number && current.status !== "CANCELED") {
            return ok({ invoice: toInvoiceDto(current) });
          }
        }
        if (!(error instanceof InvoiceNumberConflictError)) {
          throw error;
        }
      }
    }

    return err(new ConflictError("Could not allocate a unique invoice number. Retry finalizing."));
  }
}
