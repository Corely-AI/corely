import { Inject, Injectable } from "@nestjs/common";
import {
  ConflictError,
  ValidationError,
  type TransactionContext,
  type UseCaseContext,
} from "@corely/kernel";
import { AccountingApplication } from "../../../accounting/application/accounting.application";
import { CogsPostingService } from "../../../accounting/application/services/cogs-posting.service";
import {
  CATALOG_REPOSITORY,
  type CatalogRepositoryPort,
  type CatalogScope,
} from "../../../catalog/application/ports/catalog-repository.port";
import {
  INVENTORY_LOT_REPO,
  type InvoiceInventoryLotPort,
  type InvoiceLotAllocation,
} from "../../../inventory/application/ports/inventory-lot-repository.port";
import type { InvoiceAggregate } from "../../domain/invoice.aggregate";

const archivedProductReference = (reference: string) =>
  new ValidationError(
    "An invoice line references an archived product. Choose an active product before issuing.",
    { reference }
  );

@Injectable()
export class InvoiceAccountingAdapter {
  constructor(
    @Inject(AccountingApplication)
    private readonly accounting: Pick<AccountingApplication, "getSetupStatus">,
    private readonly cogs: CogsPostingService,
    @Inject(CATALOG_REPOSITORY) private readonly catalog: CatalogRepositoryPort,
    @Inject(INVENTORY_LOT_REPO) private readonly lots: InvoiceInventoryLotPort
  ) {}

  async postForInvoice(invoice: InvoiceAggregate, ctx: UseCaseContext, tx: TransactionContext) {
    const { tenantId, workspaceId } = ctx;
    if (!tenantId || !workspaceId || !invoice.issuedAt || !invoice.number) {
      throw new ValidationError(
        "Invoice accounting requires an issued invoice and workspace context."
      );
    }
    const setup = await this.accounting.getSetupStatus.getStatus(tenantId, tx);
    if (
      !setup.isSetup ||
      (await this.lots.hasInvoiceConsumption(tenantId, invoice.id, tx)) ||
      (await this.cogs.hasInvoicePosting(tenantId, invoice.id, tx))
    ) {
      return;
    }

    const quantities = new Map<string, number>();
    for (const line of invoice.lineItems) {
      const id = await this.resolveProductId(line.description, { tenantId, workspaceId }, tx);
      if (id) {
        quantities.set(id, (quantities.get(id) ?? 0) + line.qty);
      }
    }

    const stock: InvoiceLotAllocation[] = [];
    for (const [productId, qty] of quantities) {
      stock.push(...(await this.lots.allocateInvoiceLots(tenantId, productId, qty, tx)));
    }
    if (stock.length === 0) {
      return;
    }

    const posting = await this.cogs.postCogsFromLots(
      {
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        invoiceDate: invoice.invoiceDate ?? invoice.issuedAt.toISOString().slice(0, 10),
        lotAllocations: stock.map(({ lot, quantityPicked }) => ({
          lotId: lot.id,
          lotNumber: lot.lotNumber,
          productName: lot.productId,
          unitCostCents: lot.unitCostCents ?? 0,
          quantityPicked,
        })),
        currency: invoice.currency,
      },
      ctx,
      tx
    );
    if (posting.error) {
      throw new ConflictError(
        "Invoice stock costs could not be recorded. Check Accounting setup and retry."
      );
    }
    stock.sort((a, b) => a.lot.id.localeCompare(b.lot.id));
    for (const { lot, quantityPicked } of stock) {
      await this.lots.consumeInvoiceLot(lot, quantityPicked, tx);
    }
    await this.lots.recordInvoiceConsumption(tenantId, invoice.id, tx);
  }

  async assertCorrectionAllowed(tenantId: string, invoiceId: string, tx?: TransactionContext) {
    if (await this.cogs.hasInvoicePosting(tenantId, invoiceId, tx)) {
      throw new ConflictError(
        "This invoice has recorded stock costs and requires a specialist correction."
      );
    }
    if (await this.lots.hasInvoiceConsumption(tenantId, invoiceId, tx)) {
      throw new ConflictError(
        "This invoice has consumed stock and requires a specialist correction."
      );
    }
  }

  private async resolveProductId(
    description: string,
    scope: CatalogScope,
    tx: TransactionContext
  ): Promise<string | null> {
    const reference = description.trim();
    if (!reference) {
      return null;
    }
    const productId = reference.match(/\[product:([a-zA-Z0-9_-]+)\]/i)?.[1];
    const idMatch = await this.catalog.findItemById(scope, productId ?? reference, tx);
    const activeId = idMatch?.status === "ACTIVE" && !idMatch.archivedAt;
    if (productId) {
      if (idMatch && !activeId) {
        throw archivedProductReference(productId);
      }
      return productId;
    }
    if (!idMatch && (await this.lots.hasProductLots(scope.tenantId, reference, tx))) {
      return reference;
    }
    let candidate = activeId ? idMatch : null;
    if (!candidate) {
      const codeMatch = await this.catalog.findItemByCode(scope, reference, tx);
      if (codeMatch?.status === "ACTIVE" && !codeMatch.archivedAt) {
        candidate = codeMatch;
      } else if (idMatch || codeMatch) {
        throw archivedProductReference(reference);
      }
    }
    if (!candidate) {
      const matches = await this.catalog.listItems(
        scope,
        { name: reference, status: "ACTIVE", page: 1, pageSize: 2 },
        tx
      );
      if (matches.total > 1) {
        throw new ValidationError(
          "More than one product matches an invoice line. Use its product code or ID.",
          {
            reference,
          }
        );
      }
      candidate = matches.items[0] ?? null;
    }
    if (!candidate) {
      return null;
    }
    const tracksStock =
      candidate.requiresLotTracking ||
      (await this.lots.hasProductLots(scope.tenantId, candidate.id, tx));
    return tracksStock ? candidate.id : null;
  }
}
