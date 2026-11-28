import { Inject, Injectable } from "@nestjs/common";
import {
  ConflictError,
  ValidationError,
  type TransactionContext,
  type UseCaseContext,
  unwrap,
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
  type InventoryLot,
} from "../../../inventory/application/ports/inventory-lot-repository.port";
import { pickFEFO } from "../../../inventory/domain/fefo-picker";
import type { InvoiceAggregate } from "../../domain/invoice.aggregate";

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
    const setup = unwrap(await this.accounting.getSetupStatus.execute(undefined, ctx));
    if (!setup.isSetup || (await this.cogs.hasInvoicePosting(tenantId, invoice.id, tx))) {
      return;
    }

    const quantities = new Map<string, number>();
    for (const line of invoice.lineItems) {
      const id = await this.resolveProductId(line.description, { tenantId, workspaceId }, tx);
      if (id) {
        quantities.set(id, (quantities.get(id) ?? 0) + line.qty);
      }
    }

    const stock: Array<{ lot: InventoryLot; quantityPicked: number }> = [];
    for (const [productId, qty] of quantities) {
      const available = await this.lots.listAvailableLots(tenantId, productId, tx);
      const pick = pickFEFO(available, qty);
      if (pick.shortfall > 0) {
        throw new ValidationError("Insufficient available, unexpired stock for an invoice line.", {
          productId,
          qtyRequested: qty,
          availableQty: pick.quantityAllocated,
        });
      }
      const lotsById = new Map(available.map((lot) => [lot.id, lot]));
      for (const allocation of pick.allocations) {
        const lot = lotsById.get(allocation.lotId);
        if (lot) {
          stock.push({ lot, quantityPicked: allocation.quantityPicked });
        }
      }
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
    if (posting.journalEntryId) {
      stock.sort((a, b) => a.lot.id.localeCompare(b.lot.id));
      for (const { lot, quantityPicked } of stock) {
        await this.lots.consumeInvoiceLot(lot, quantityPicked, tx);
      }
    }
  }

  async assertCorrectionAllowed(tenantId: string, invoiceId: string, tx: TransactionContext) {
    if (await this.cogs.hasInvoicePosting(tenantId, invoiceId, tx)) {
      throw new ConflictError(
        "This invoice has recorded stock costs and requires a specialist correction."
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
    if (productId) {
      return productId;
    }
    if (await this.lots.hasProductLots(scope.tenantId, reference, tx)) {
      return reference;
    }
    const item =
      (await this.catalog.findItemById(scope, reference)) ??
      (await this.catalog.findItemByCode(scope, reference));
    const candidate =
      item && !item.archivedAt
        ? item
        : (await this.catalog.listItems(scope, { name: reference, page: 1, pageSize: 1 })).items[0];
    if (!candidate) {
      return null;
    }
    const tracksStock =
      candidate.requiresLotTracking ||
      (await this.lots.hasProductLots(scope.tenantId, candidate.id, tx));
    return tracksStock ? candidate.id : null;
  }
}
