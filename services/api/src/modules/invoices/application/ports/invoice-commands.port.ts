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

/**
 * Invoice Commands Port - The canonical interface for all invoice write operations.
 *
 * This port defines the contract for creating, updating, and managing invoices.
 * It is implemented by the Invoices module and can be consumed by other modules
 * (e.g., Sales) to create invoices without directly accessing invoice repositories.
 *
 * This port enforces the single source of truth pattern for invoice business logic.
 */
export interface InvoiceCommandsPort {
  /**
   * Creates a new draft invoice.
   */
  createDraft(
    input: CreateInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateInvoiceOutput, UseCaseError>>;

  /**
   * Updates an existing draft invoice.
   */
  updateDraft(
    input: UpdateInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateInvoiceOutput, UseCaseError>>;

  /**
   * Finalizes (issues) an invoice, making it immutable.
   * Generates invoice number and optionally triggers PDF generation.
   */
  finalize(
    input: FinalizeInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<FinalizeInvoiceOutput, UseCaseError>>;

  /**
   * Sends an invoice via email to the customer.
   */
  send(
    input: SendInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<SendInvoiceOutput, UseCaseError>>;

  /**
   * Records a payment against an invoice.
   */
  recordPayment(
    input: RecordPaymentInput,
    ctx: UseCaseContext
  ): Promise<Result<RecordPaymentOutput, UseCaseError>>;

  /**
   * Cancels an invoice.
   */
  cancel(
    input: CancelInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<CancelInvoiceOutput, UseCaseError>>;

  /**
   * Retrieves an invoice by ID.
   */
  getById(
    input: GetInvoiceByIdInput,
    ctx: UseCaseContext
  ): Promise<Result<GetInvoiceByIdOutput, UseCaseError>>;

  /**
   * Lists invoices with optional filters.
   */
  list(
    input: ListInvoicesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListInvoicesOutput, UseCaseError>>;

  /**
   * Creates a draft invoice from a sales source (order or quote).
   * This is a specialized command for sales workflows.
   */
  createDraftFromSalesSource(
    input: CreateInvoiceFromSalesSourceInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateInvoiceOutput, UseCaseError>>;
}

/**
 * Input for creating an invoice from a sales source (order, quote, deal).
 */
export interface CreateInvoiceFromSalesSourceInput {
  sourceType: "order" | "quote" | "deal";
  sourceId: string;
  customerPartyId: string;
  customerContactPartyId?: string;
  currency: string;
  invoiceDate?: string; // LocalDate string
  dueDate?: string; // LocalDate string
  notes?: string;
  terms?: string;
  lineItems: Array<{
    description: string;
    qty: number;
    unitPriceCents: number;
  }>;
  idempotencyKey?: string;
}

/**
 * Injection token for the Invoice Commands Port.
 */
export const INVOICE_COMMANDS = Symbol("INVOICE_COMMANDS");
