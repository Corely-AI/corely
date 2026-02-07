import { Injectable, Inject } from "@nestjs/common";
import type { LoggerPort } from "@corely/kernel";
import { CreateJournalEntryUseCase } from "../use-cases/create-journal-entry.usecase";
import type { LedgerAccountRepositoryPort } from "../../domain/ports/ledger-account-repository.port";
import type { UseCaseContext } from "@corely/kernel";

/**
 * Service for automatically posting COGS journal entries when invoices are issued
 *
 * When an invoice is issued:
 * 1. Determines inventory consumed (from invoice lines)
 * 2. Calculates COGS from lot costs or default product costs
 * 3. Creates journal entry: Debit COGS, Credit Inventory
 *
 * This ensures accurate P&L without manual journal entry creation.
 */
@Injectable()
export class CogsPostingService {
  constructor(
    @Inject("LoggerPort") private readonly logger: LoggerPort,
    private readonly createJournalEntry: CreateJournalEntryUseCase,
    private readonly accountRepo: LedgerAccountRepositoryPort
  ) {}

  /**
   * Posts COGS journal entry for an issued invoice
   *
   * @param params Invoice details with line items
   * @param ctx Use case context with tenant and user
   * @returns Journal entry ID if successful, null if skipped or failed
   */
  async postCogsForInvoice(
    params: {
      invoiceId: string;
      invoiceNumber: string;
      invoiceDate: string; // ISO date
      lines: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitCostCents?: number | null; // From lot or default cost
      }>;
      currency: string;
    },
    ctx: UseCaseContext
  ): Promise<{ journalEntryId: string | null; error?: string }> {
    const tenantId = ctx.tenantId!;

    try {
      // Calculate total COGS
      let totalCogsCents = 0;
      const lineDetails: string[] = [];

      for (const line of params.lines) {
        const unitCost = line.unitCostCents || 0;
        const lineCogs = Math.round(unitCost * line.quantity);
        totalCogsCents += lineCogs;

        if (lineCogs > 0) {
          lineDetails.push(
            `${line.productName} (${line.quantity} units @ ${unitCost / 100} ${params.currency})`
          );
        }
      }

      // Skip if no COGS to post
      if (totalCogsCents === 0) {
        this.logger.info("Skipping COGS posting - no cost data available", {
          invoiceId: params.invoiceId,
          invoiceNumber: params.invoiceNumber,
        });
        return { journalEntryId: null };
      }

      // Find COGS and Inventory accounts
      const cogsAccount = await this.accountRepo.findBySystemKey(tenantId, "COGS");
      const inventoryAccount = await this.accountRepo.findByCode(tenantId, "1500"); // Standard inventory account

      if (!cogsAccount) {
        this.logger.error("COGS account not found - cannot post COGS", { tenantId });
        return { journalEntryId: null, error: "COGS account not found" };
      }

      if (!inventoryAccount) {
        this.logger.error("Inventory account not found - cannot post COGS", { tenantId });
        return { journalEntryId: null, error: "Inventory account not found" };
      }

      // Create journal entry: Debit COGS, Credit Inventory
      const memo = `COGS for Invoice ${params.invoiceNumber} - ${lineDetails.slice(0, 3).join(", ")}${lineDetails.length > 3 ? ` and ${lineDetails.length - 3} more` : ""}`;

      const result = await this.createJournalEntry.execute(
        {
          postingDate: params.invoiceDate,
          memo,
          sourceType: "Invoice",
          sourceId: params.invoiceId,
          sourceRef: params.invoiceNumber,
          lines: [
            {
              ledgerAccountId: cogsAccount.id,
              direction: "Debit",
              amountCents: totalCogsCents,
              currency: params.currency,
              lineMemo: "Cost of goods sold",
              reference: params.invoiceNumber,
              tags: ["auto-cogs", `invoice:${params.invoiceId}`],
            },
            {
              ledgerAccountId: inventoryAccount.id,
              direction: "Credit",
              amountCents: totalCogsCents,
              currency: params.currency,
              lineMemo: "Inventory reduction",
              reference: params.invoiceNumber,
              tags: ["auto-cogs", `invoice:${params.invoiceId}`],
            },
          ],
        },
        ctx
      );

      if (!result.ok) {
        this.logger.error("Failed to create COGS journal entry", {
          invoiceId: params.invoiceId,
          error: result.error,
        });
        return { journalEntryId: null, error: result.error.message };
      }

      this.logger.info("COGS journal entry created successfully", {
        invoiceId: params.invoiceId,
        journalEntryId: result.value.entry.id,
        totalCogsCents,
      });

      return { journalEntryId: result.value.entry.id };
    } catch (error) {
      this.logger.error("Unexpected error posting COGS", {
        invoiceId: params.invoiceId,
        error,
      });
      return { journalEntryId: null, error: String(error) };
    }
  }

  /**
   * Posts COGS journal entry using lot-based FEFO costing
   *
   * This version uses actual lot costs from FEFO picking allocation.
   * Use this when inventory lots are tracked with unit costs.
   *
   * @param params Invoice and lot allocation details
   * @param ctx Use case context
   * @returns Journal entry ID if successful
   */
  async postCogsFromLots(
    params: {
      invoiceId: string;
      invoiceNumber: string;
      invoiceDate: string;
      lotAllocations: Array<{
        lotId: string;
        lotNumber: string;
        productName: string;
        quantityPicked: number;
        unitCostCents: number;
      }>;
      currency: string;
    },
    ctx: UseCaseContext
  ): Promise<{ journalEntryId: string | null; error?: string }> {
    // Calculate line costs from lot allocations
    const lines = params.lotAllocations.map((allocation) => ({
      productId: allocation.lotId, // Using lotId as productId for simplicity
      productName: `${allocation.productName} (Lot ${allocation.lotNumber})`,
      quantity: allocation.quantityPicked,
      unitCostCents: allocation.unitCostCents,
    }));

    return this.postCogsForInvoice(
      {
        invoiceId: params.invoiceId,
        invoiceNumber: params.invoiceNumber,
        invoiceDate: params.invoiceDate,
        lines,
        currency: params.currency,
      },
      ctx
    );
  }
}
