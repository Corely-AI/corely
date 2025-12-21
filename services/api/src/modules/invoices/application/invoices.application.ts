import { GetInvoiceByIdUseCase } from "./use-cases/get-invoice-by-id/GetInvoiceByIdUseCase";
import { UpdateInvoiceUseCase } from "./use-cases/update-invoice/UpdateInvoiceUseCase";
import { CreateInvoiceUseCase } from "./use-cases/create-invoice/CreateInvoiceUseCase";
import { FinalizeInvoiceUseCase } from "./use-cases/finalize-invoice/FinalizeInvoiceUseCase";
import { SendInvoiceUseCase } from "./use-cases/send-invoice/SendInvoiceUseCase";
import { RecordPaymentUseCase } from "./use-cases/record-payment/RecordPaymentUseCase";
import { CancelInvoiceUseCase } from "./use-cases/cancel-invoice/CancelInvoiceUseCase";
import { ListInvoicesUseCase } from "./use-cases/list-invoices/ListInvoicesUseCase";

export class InvoicesApplication {
  constructor(
    public readonly createInvoice: CreateInvoiceUseCase,
    public readonly updateInvoice: UpdateInvoiceUseCase,
    public readonly finalizeInvoice: FinalizeInvoiceUseCase,
    public readonly sendInvoice: SendInvoiceUseCase,
    public readonly recordPayment: RecordPaymentUseCase,
    public readonly cancelInvoice: CancelInvoiceUseCase,
    public readonly getInvoiceById: GetInvoiceByIdUseCase,
    public readonly listInvoices: ListInvoicesUseCase
  ) {}
}
