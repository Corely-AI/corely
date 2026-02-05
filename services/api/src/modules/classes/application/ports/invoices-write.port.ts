import type { Result, UseCaseContext, UseCaseError } from "@corely/kernel";
import type {
  CreateInvoiceInput,
  CreateInvoiceOutput,
  SendInvoiceInput,
  SendInvoiceOutput,
} from "@corely/contracts";

export interface InvoicesWritePort {
  createDraft(
    input: CreateInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateInvoiceOutput, UseCaseError>>;
  send(
    input: SendInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<SendInvoiceOutput, UseCaseError>>;
}

export const INVOICES_WRITE_PORT = "classes/invoices-write";
