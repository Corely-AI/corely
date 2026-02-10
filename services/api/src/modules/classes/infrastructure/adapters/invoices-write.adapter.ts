import { Inject, Injectable } from "@nestjs/common";
import type { UseCaseContext, Result, UseCaseError } from "@corely/kernel";
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
import {
  INVOICE_COMMANDS,
  type InvoiceCommandsPort,
} from "../../../invoices/application/ports/invoice-commands.port";
import type { InvoicesWritePort } from "../../application/ports/invoices-write.port";

@Injectable()
export class InvoicesWriteAdapter implements InvoicesWritePort {
  constructor(@Inject(INVOICE_COMMANDS) private readonly invoiceCommands: InvoiceCommandsPort) {}

  createDraft(
    input: CreateInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateInvoiceOutput, UseCaseError>> {
    return this.invoiceCommands.createDraft(input, ctx);
  }

  cancel(
    input: CancelInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<CancelInvoiceOutput, UseCaseError>> {
    return this.invoiceCommands.cancel(input, ctx);
  }

  finalize(
    input: FinalizeInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<FinalizeInvoiceOutput, UseCaseError>> {
    return this.invoiceCommands.finalize(input, ctx);
  }

  send(
    input: SendInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<SendInvoiceOutput, UseCaseError>> {
    return this.invoiceCommands.send(input, ctx);
  }
}
