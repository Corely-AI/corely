import type { Result, UseCaseContext, UseCaseError } from "@corely/kernel";
import type {
  CreateInvoiceInput,
  CreateInvoiceOutput,
  CancelInvoiceInput,
  CancelInvoiceOutput,
  FinalizeInvoiceInput,
  FinalizeInvoiceOutput,
  SendInvoiceInput,
  SendInvoiceOutput,
} from "@corely/contracts";

export interface InvoicesWritePort {
  createDraft(
    input: CreateInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateInvoiceOutput, UseCaseError>>;
  cancel(
    input: CancelInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<CancelInvoiceOutput, UseCaseError>>;
  finalize(
    input: FinalizeInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<FinalizeInvoiceOutput, UseCaseError>>;
  send(
    input: SendInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<SendInvoiceOutput, UseCaseError>>;
}

export const INVOICES_WRITE_PORT = "classes/invoices-write";
