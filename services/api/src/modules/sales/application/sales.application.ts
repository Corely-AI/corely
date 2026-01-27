import type { CreateQuoteUseCase } from "./use-cases/create-quote.usecase";
import type { UpdateQuoteUseCase } from "./use-cases/update-quote.usecase";
import type { SendQuoteUseCase } from "./use-cases/send-quote.usecase";
import type { AcceptQuoteUseCase } from "./use-cases/accept-quote.usecase";
import type { RejectQuoteUseCase } from "./use-cases/reject-quote.usecase";
import type { ConvertQuoteToOrderUseCase } from "./use-cases/convert-quote-to-order.usecase";
import type { ConvertQuoteToInvoiceUseCase } from "./use-cases/convert-quote-to-invoice.usecase";
import type { GetQuoteUseCase } from "./use-cases/get-quote.usecase";
import type { ListQuotesUseCase } from "./use-cases/list-quotes.usecase";

import type { CreateSalesOrderUseCase } from "./use-cases/create-sales-order.usecase";
import type { UpdateSalesOrderUseCase } from "./use-cases/update-sales-order.usecase";
import type { ConfirmSalesOrderUseCase } from "./use-cases/confirm-sales-order.usecase";
import type { FulfillSalesOrderUseCase } from "./use-cases/fulfill-sales-order.usecase";
import type { CancelSalesOrderUseCase } from "./use-cases/cancel-sales-order.usecase";
import type { CreateInvoiceFromOrderUseCase } from "./use-cases/create-invoice-from-order.usecase";
import type { GetSalesOrderUseCase } from "./use-cases/get-sales-order.usecase";
import type { ListSalesOrdersUseCase } from "./use-cases/list-sales-orders.usecase";

import type { GetSalesSettingsUseCase } from "./use-cases/get-sales-settings.usecase";
import type { UpdateSalesSettingsUseCase } from "./use-cases/update-sales-settings.usecase";

export class SalesApplication {
  constructor(
    public readonly createQuote: CreateQuoteUseCase,
    public readonly updateQuote: UpdateQuoteUseCase,
    public readonly sendQuote: SendQuoteUseCase,
    public readonly acceptQuote: AcceptQuoteUseCase,
    public readonly rejectQuote: RejectQuoteUseCase,
    public readonly convertQuoteToOrder: ConvertQuoteToOrderUseCase,
    public readonly convertQuoteToInvoice: ConvertQuoteToInvoiceUseCase,
    public readonly getQuote: GetQuoteUseCase,
    public readonly listQuotes: ListQuotesUseCase,

    public readonly createOrder: CreateSalesOrderUseCase,
    public readonly updateOrder: UpdateSalesOrderUseCase,
    public readonly confirmOrder: ConfirmSalesOrderUseCase,
    public readonly fulfillOrder: FulfillSalesOrderUseCase,
    public readonly cancelOrder: CancelSalesOrderUseCase,
    public readonly createInvoiceFromOrder: CreateInvoiceFromOrderUseCase,
    public readonly getOrder: GetSalesOrderUseCase,
    public readonly listOrders: ListSalesOrdersUseCase,

    public readonly getSettings: GetSalesSettingsUseCase,
    public readonly updateSettings: UpdateSalesSettingsUseCase
  ) {}
}
