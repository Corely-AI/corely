import { Injectable } from "@nestjs/common";
import type { Result, UseCaseContext, UseCaseError } from "@corely/kernel";
import type {
  CreateInvoiceInput,
  CreateInvoiceOutput,
  UpdateInvoiceInput,
  UpdateInvoiceOutput,
  FinalizeInvoiceInput,
  FinalizeInvoiceOutput,
  CancelInvoiceInput,
  CancelInvoiceOutput,
  SendInvoiceInput,
  SendInvoiceOutput,
  GetInvoiceByIdInput,
  GetInvoiceByIdOutput,
  ListInvoicesInput,
  ListInvoicesOutput,
  RecordPaymentInput,
  RecordPaymentOutput,
} from "@corely/contracts";
import type {
  InvoiceCommandsPort,
  CreateInvoiceFromSalesSourceInput,
} from "../ports/invoice-commands.port";
import { InvoicesApplication } from "../invoices.application";

/**
 * Invoice Command Service - Canonical implementation of invoice write operations.
 *
 * This service implements the InvoiceCommandsPort interface and serves as the
 * single source of truth for all invoice business logic. It delegates to the
 * appropriate use cases in the Invoices application.
 *
 * Other modules (e.g., Sales) should depend on the InvoiceCommandsPort interface,
 * not directly on this implementation, to maintain proper dependency boundaries.
 */
@Injectable()
export class InvoiceCommandService implements InvoiceCommandsPort {
  constructor(private readonly invoicesApp: InvoicesApplication) {}

  async createDraft(
    input: CreateInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateInvoiceOutput, UseCaseError>> {
    return this.invoicesApp.createInvoice.execute(input, ctx);
  }

  async updateDraft(
    input: UpdateInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateInvoiceOutput, UseCaseError>> {
    return this.invoicesApp.updateInvoice.execute(input, ctx);
  }

  async finalize(
    input: FinalizeInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<FinalizeInvoiceOutput, UseCaseError>> {
    return this.invoicesApp.finalizeInvoice.execute(input, ctx);
  }

  async send(
    input: SendInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<SendInvoiceOutput, UseCaseError>> {
    return this.invoicesApp.sendInvoice.execute(input, ctx);
  }

  async recordPayment(
    input: RecordPaymentInput,
    ctx: UseCaseContext
  ): Promise<Result<RecordPaymentOutput, UseCaseError>> {
    return this.invoicesApp.recordPayment.execute(input, ctx);
  }

  async cancel(
    input: CancelInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<CancelInvoiceOutput, UseCaseError>> {
    return this.invoicesApp.cancelInvoice.execute(input, ctx);
  }

  async getById(
    input: GetInvoiceByIdInput,
    ctx: UseCaseContext
  ): Promise<Result<GetInvoiceByIdOutput, UseCaseError>> {
    return this.invoicesApp.getInvoiceById.execute(input, ctx);
  }

  async list(
    input: ListInvoicesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListInvoicesOutput, UseCaseError>> {
    return this.invoicesApp.listInvoices.execute(input, ctx);
  }

  /**
   * Creates a draft invoice from a sales source (order, quote, deal).
   *
   * This specialized method allows sales workflows to create invoices while
   * maintaining the invoice module as the single source of truth for invoice logic.
   *
   * The source information is stored on the invoice for traceability, but the
   * invoice module does not depend on the sales module - it only stores the
   * source type and ID as metadata.
   */
  async createDraftFromSalesSource(
    input: CreateInvoiceFromSalesSourceInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateInvoiceOutput, UseCaseError>> {
    // Map the sales source input to the standard invoice creation input
    const createInput: CreateInvoiceInput = {
      customerPartyId: input.customerPartyId,
      customerContactPartyId: input.customerContactPartyId,
      currency: input.currency,
      invoiceDate: input.invoiceDate,
      dueDate: input.dueDate,
      notes: input.notes,
      terms: input.terms,
      lineItems: input.lineItems,
      // Store source metadata for traceability
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      idempotencyKey: input.idempotencyKey,
    };

    return this.invoicesApp.createInvoice.execute(createInput, ctx);
  }
}
