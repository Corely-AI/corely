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
import type { PrismaService } from "@corely/data";
import { type InvoiceRepoPort } from "../../ports/invoice-repository.port";
import { type InvoiceNumberingPort } from "../../ports/invoice-numbering.port";
import { toInvoiceDto } from "../shared/invoice-dto.mapper";
import { type CustomerQueryPort } from "../../ports/customer-query.port";
import { type PaymentMethodQueryPort } from "../../ports/payment-method-query.port";
import { type TaxEngineService } from "../../../../tax/application/services/tax-engine.service";
import { CogsPostingService } from "../../../../accounting/application/services/cogs-posting.service";

type Deps = {
  logger: LoggerPort;
  invoiceRepo: InvoiceRepoPort;
  numbering: InvoiceNumberingPort;
  clock: ClockPort;
  customerQuery: CustomerQueryPort;
  paymentMethodQuery: PaymentMethodQueryPort;
  taxEngine: TaxEngineService;
  prisma: PrismaService;
  cogsPostingService: CogsPostingService;
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
    await this.tryPostCogsFromLots(invoice, ctx);
    return ok({ invoice: toInvoiceDto(invoice) });
  }

  private async tryPostCogsFromLots(
    invoice: {
      id: string;
      number: string | null;
      currency: string;
      issuedAt: Date | null;
      lineItems: Array<{ description: string; qty: number }>;
    },
    ctx: UseCaseContext
  ): Promise<void> {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      return;
    }

    const existingCogsEntry = await this.useCaseDeps.prisma.journalEntry.findFirst({
      where: {
        tenantId,
        sourceType: "Invoice",
        sourceId: invoice.id,
      },
      select: { id: true },
    });
    if (existingCogsEntry) {
      return;
    }

    const allocations: Array<{
      lotId: string;
      lotNumber: string;
      productName: string;
      quantityPicked: number;
      unitCostCents: number;
    }> = [];
    const lotUsage = new Map<string, number>();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (const line of invoice.lineItems) {
      const productId = await this.resolveProductIdFromLine(line.description, tenantId);
      if (!productId) {
        continue;
      }

      const qtyRequested = Math.max(0, Math.trunc(line.qty));
      if (qtyRequested === 0) {
        continue;
      }

      const lots = await this.useCaseDeps.prisma.inventoryLot.findMany({
        where: {
          tenantId,
          productId,
          archivedAt: null,
          status: "AVAILABLE",
          qtyOnHand: { gt: 0 },
        },
        orderBy: [{ expiryDate: "asc" }, { receivedDate: "asc" }, { createdAt: "asc" }],
      });

      const nonExpiredLots = lots.filter((lot) => !lot.expiryDate || lot.expiryDate >= today);
      const hasExpiredStock = lots.some((lot) => lot.expiryDate && lot.expiryDate < today);
      const availableQty = nonExpiredLots.reduce(
        (sum, lot) => sum + Math.max(0, lot.qtyOnHand - lot.qtyReserved),
        0
      );

      if (availableQty < qtyRequested) {
        if (hasExpiredStock) {
          throw new ValidationError(
            "Cannot issue invoice because available lots for a product are expired."
          );
        }
        throw new ValidationError("Insufficient available lot quantity for invoice line", {
          productId,
          qtyRequested,
          availableQty,
        });
      }

      let remaining = qtyRequested;
      for (const lot of nonExpiredLots) {
        if (remaining <= 0) {
          break;
        }

        const alreadyAllocated = lotUsage.get(lot.id) ?? 0;
        const freeQty = Math.max(0, lot.qtyOnHand - lot.qtyReserved - alreadyAllocated);
        if (freeQty <= 0) {
          continue;
        }

        const picked = Math.min(remaining, freeQty);
        const unitCostCents = lot.unitCostCents ?? 0;

        allocations.push({
          lotId: lot.id,
          lotNumber: lot.lotNumber,
          productName: productId,
          quantityPicked: picked,
          unitCostCents,
        });

        lotUsage.set(lot.id, alreadyAllocated + picked);
        remaining -= picked;
      }
    }

    if (allocations.length === 0) {
      return;
    }

    const cogsResult = await this.useCaseDeps.cogsPostingService.postCogsFromLots(
      {
        invoiceId: invoice.id,
        invoiceNumber: invoice.number ?? invoice.id,
        invoiceDate: (invoice.issuedAt ?? this.useCaseDeps.clock.now()).toISOString().slice(0, 10),
        lotAllocations: allocations,
        currency: invoice.currency,
      },
      ctx
    );

    if (!cogsResult.journalEntryId) {
      return;
    }

    await this.useCaseDeps.prisma.$transaction(async (tx) => {
      for (const [lotId, qty] of lotUsage.entries()) {
        await tx.inventoryLot.update({
          where: { id: lotId },
          data: {
            qtyOnHand: { decrement: qty },
          },
        });
      }
    });
  }

  private async resolveProductIdFromLine(
    description: string,
    tenantId: string
  ): Promise<string | null> {
    const trimmed = description.trim();
    if (!trimmed) {
      return null;
    }

    const inlineProductReference = trimmed.match(/\[product:([a-zA-Z0-9_-]+)\]/i);
    if (inlineProductReference?.[1]) {
      return inlineProductReference[1];
    }

    const lotForDirectId = await this.useCaseDeps.prisma.inventoryLot.findFirst({
      where: {
        tenantId,
        productId: trimmed,
        archivedAt: null,
      },
      select: { id: true },
    });
    if (lotForDirectId) {
      return trimmed;
    }

    const catalogItem = await this.useCaseDeps.prisma.catalogItem.findFirst({
      where: {
        tenantId,
        archivedAt: null,
        OR: [{ id: trimmed }, { code: trimmed }, { name: trimmed }],
      },
      select: { id: true },
    });

    return catalogItem?.id ?? null;
  }
}
