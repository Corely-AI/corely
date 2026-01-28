import {
  BaseUseCase,
  type ClockPort,
  ConflictError,
  type LoggerPort,
  NotFoundError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import { type FinalizeInvoiceInput, type FinalizeInvoiceOutput } from "@corely/contracts";
import { type InvoiceRepoPort } from "../../ports/invoice-repository.port";
import { type InvoiceNumberingPort } from "../../ports/invoice-numbering.port";
import { toInvoiceDto } from "../shared/invoice-dto.mapper";
import { type CustomerQueryPort } from "../../ports/customer-query.port";
import { type PaymentMethodQueryPort } from "../../ports/payment-method-query.port";
import { type TaxEngineService } from "../../../../tax/application/services/tax-engine.service";

type Deps = {
  logger: LoggerPort;
  invoiceRepo: InvoiceRepoPort;
  numbering: InvoiceNumberingPort;
  clock: ClockPort;
  customerQuery: CustomerQueryPort;
  paymentMethodQuery: PaymentMethodQueryPort;
  taxEngine: TaxEngineService;
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
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId missing from context"));
    }

    const invoice = await this.useCaseDeps.invoiceRepo.findById(ctx.workspaceId, input.invoiceId);
    if (!invoice) {
      return err(new NotFoundError("Invoice not found"));
    }

    const customer = await this.useCaseDeps.customerQuery.getCustomerBillingSnapshot(
      ctx.tenantId,
      invoice.customerPartyId
    );
    if (!customer) {
      return err(new NotFoundError("Customer not found"));
    }

    try {
      const paymentSnapshot = await this.useCaseDeps.paymentMethodQuery.getPaymentMethodSnapshot(
        ctx.tenantId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (input as any).paymentMethodId
      );

      // Calculate tax snapshot before finalizing
      const now = this.useCaseDeps.clock.now();
      const documentDate = invoice.issuedAt ?? now;

      let taxSnapshot = null;
      try {
        const taxBreakdown = await this.useCaseDeps.taxEngine.calculate(
          {
            jurisdiction: "DE",
            documentDate: documentDate.toISOString(),
            currency: invoice.currency,
            customer:
              customer.vatId || customer.billingAddress?.country
                ? {
                    country: customer.billingAddress?.country ?? "DE",
                    isBusiness: !!customer.vatId,
                    vatId: customer.vatId ?? undefined,
                  }
                : undefined,
            lines: invoice.lineItems.map((line) => ({
              id: line.id,
              description: line.description,
              qty: line.qty,
              netAmountCents: line.qty * line.unitPriceCents,
              taxCodeId: undefined,
            })),
          },
          ctx.tenantId
        );

        taxSnapshot = {
          subtotalAmountCents: taxBreakdown.subtotalAmountCents,
          taxTotalAmountCents: taxBreakdown.taxTotalAmountCents,
          totalAmountCents: taxBreakdown.totalAmountCents,
          lines: taxBreakdown.lines,
          totalsByKind: taxBreakdown.totalsByKind,
          appliedAt: now.toISOString(),
        };
      } catch (taxError: unknown) {
        // If tax calculation fails, log but don't block finalization
        console.error("TAX CALC FAILURE:", JSON.stringify(taxError, null, 2));
        this.useCaseDeps.logger.warn(
          `Failed to calculate tax for invoice ${invoice.id}`,
          taxError as Record<string, unknown>
        );
      }

      // Update tax snapshot before finalizing
      if (taxSnapshot) {
        invoice.updateSnapshots({ taxSnapshot }, now);
      }

      const number = await this.useCaseDeps.numbering.nextInvoiceNumber(ctx.workspaceId);
      invoice.finalize(
        number,
        now,
        now,
        {
          name: customer.displayName,
          email: customer.email ?? null,
          vatId: customer.vatId ?? null,
          address: customer.billingAddress
            ? {
                line1: customer.billingAddress.line1,
                line2: customer.billingAddress.line2 ?? null,
                city: customer.billingAddress.city ?? null,
                postalCode: customer.billingAddress.postalCode ?? null,
                country: customer.billingAddress.country ?? null,
              }
            : undefined,
        },
        paymentSnapshot ?? undefined
      );
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ConflictError) {
        return err(error);
      }
      return err(new ConflictError((error as Error).message));
    }

    await this.useCaseDeps.invoiceRepo.save(ctx.workspaceId, invoice);
    return ok({ invoice: toInvoiceDto(invoice) });
  }
}
