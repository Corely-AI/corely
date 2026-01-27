import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { AUDIT_PORT } from "@corely/kernel";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { IdentityModule } from "../identity";
import { PlatformModule } from "../platform";
import { SystemIdGenerator } from "../../shared/infrastructure/system-id-generator";
import { SystemClock } from "../../shared/infrastructure/system-clock";
import { SalesController } from "./adapters/http/sales.controller";
import { SalesApplication } from "./application/sales.application";
import { PrismaQuoteRepositoryAdapter } from "./infrastructure/adapters/prisma-quote-repository.adapter";
import { PrismaSalesOrderRepositoryAdapter } from "./infrastructure/adapters/prisma-order-repository.adapter";
import { PrismaSalesSettingsRepositoryAdapter } from "./infrastructure/adapters/prisma-settings-repository.adapter";
import { QUOTE_REPOSITORY_PORT } from "./application/ports/quote-repository.port";
import { SALES_ORDER_REPOSITORY_PORT } from "./application/ports/order-repository.port";
import { SALES_SETTINGS_REPOSITORY_PORT } from "./application/ports/settings-repository.port";
import { ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import { CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { IDEMPOTENCY_STORAGE_PORT_TOKEN } from "../../shared/ports/idempotency-storage.port";
import { PartyModule } from "../party";
import { CUSTOMER_QUERY_PORT } from "../party/application/ports/customer-query.port";
import { AccountingModule } from "../accounting";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { InvoicesModule } from "../invoices/invoices.module";
import { INVOICE_COMMANDS } from "../invoices/application/ports/invoice-commands.port";
import { CreateQuoteUseCase } from "./application/use-cases/create-quote.usecase";
import { UpdateQuoteUseCase } from "./application/use-cases/update-quote.usecase";
import { SendQuoteUseCase } from "./application/use-cases/send-quote.usecase";
import { AcceptQuoteUseCase } from "./application/use-cases/accept-quote.usecase";
import { RejectQuoteUseCase } from "./application/use-cases/reject-quote.usecase";
import { ConvertQuoteToOrderUseCase } from "./application/use-cases/convert-quote-to-order.usecase";
import { ConvertQuoteToInvoiceUseCase } from "./application/use-cases/convert-quote-to-invoice.usecase";
import { GetQuoteUseCase } from "./application/use-cases/get-quote.usecase";
import { ListQuotesUseCase } from "./application/use-cases/list-quotes.usecase";

import { CreateSalesOrderUseCase } from "./application/use-cases/create-sales-order.usecase";
import { UpdateSalesOrderUseCase } from "./application/use-cases/update-sales-order.usecase";
import { ConfirmSalesOrderUseCase } from "./application/use-cases/confirm-sales-order.usecase";
import { FulfillSalesOrderUseCase } from "./application/use-cases/fulfill-sales-order.usecase";
import { CancelSalesOrderUseCase } from "./application/use-cases/cancel-sales-order.usecase";
import { CreateInvoiceFromOrderUseCase } from "./application/use-cases/create-invoice-from-order.usecase";
import { GetSalesOrderUseCase } from "./application/use-cases/get-sales-order.usecase";
import { ListSalesOrdersUseCase } from "./application/use-cases/list-sales-orders.usecase";

import { GetSalesSettingsUseCase } from "./application/use-cases/get-sales-settings.usecase";
import { UpdateSalesSettingsUseCase } from "./application/use-cases/update-sales-settings.usecase";

@Module({
  imports: [
    DataModule,
    KernelModule,
    PartyModule,
    AccountingModule,
    IdentityModule,
    PlatformModule,
    InvoicesModule,
  ],
  controllers: [SalesController],
  providers: [
    PrismaQuoteRepositoryAdapter,
    PrismaSalesOrderRepositoryAdapter,
    PrismaSalesSettingsRepositoryAdapter,

    { provide: QUOTE_REPOSITORY_PORT, useExisting: PrismaQuoteRepositoryAdapter },
    { provide: SALES_ORDER_REPOSITORY_PORT, useExisting: PrismaSalesOrderRepositoryAdapter },
    { provide: SALES_SETTINGS_REPOSITORY_PORT, useExisting: PrismaSalesSettingsRepositoryAdapter },

    {
      provide: CreateQuoteUseCase,
      useFactory: (
        quoteRepo,
        settingsRepo,
        orderRepo,
        idGenerator,
        clock,
        customerQuery,
        idempotency,
        audit,
        invoiceCommands
      ) =>
        new CreateQuoteUseCase({
          logger: new NestLoggerAdapter(),
          quoteRepo,
          settingsRepo,
          orderRepo,
          idGenerator,
          clock,
          customerQuery,
          idempotency,
          audit,
          invoiceCommands,
        }),
      inject: [
        QUOTE_REPOSITORY_PORT,
        SALES_SETTINGS_REPOSITORY_PORT,
        SALES_ORDER_REPOSITORY_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        CUSTOMER_QUERY_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        AUDIT_PORT,
        INVOICE_COMMANDS,
      ],
    },
    {
      provide: UpdateQuoteUseCase,
      useFactory: (
        quoteRepo,
        settingsRepo,
        orderRepo,
        idGenerator,
        clock,
        customerQuery,
        idempotency,
        audit,
        invoiceCommands
      ) =>
        new UpdateQuoteUseCase({
          logger: new NestLoggerAdapter(),
          quoteRepo,
          settingsRepo,
          orderRepo,
          idGenerator,
          clock,
          customerQuery,
          idempotency,
          audit,
          invoiceCommands,
        }),
      inject: [
        QUOTE_REPOSITORY_PORT,
        SALES_SETTINGS_REPOSITORY_PORT,
        SALES_ORDER_REPOSITORY_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        CUSTOMER_QUERY_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        AUDIT_PORT,
        INVOICE_COMMANDS,
      ],
    },
    {
      provide: SendQuoteUseCase,
      useFactory: (
        quoteRepo,
        settingsRepo,
        orderRepo,
        idGenerator,
        clock,
        customerQuery,
        idempotency,
        audit,
        invoiceCommands
      ) =>
        new SendQuoteUseCase({
          logger: new NestLoggerAdapter(),
          quoteRepo,
          settingsRepo,
          orderRepo,
          idGenerator,
          clock,
          customerQuery,
          idempotency,
          audit,
          invoiceCommands,
        }),
      inject: [
        QUOTE_REPOSITORY_PORT,
        SALES_SETTINGS_REPOSITORY_PORT,
        SALES_ORDER_REPOSITORY_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        CUSTOMER_QUERY_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        AUDIT_PORT,
        INVOICE_COMMANDS,
      ],
    },
    {
      provide: AcceptQuoteUseCase,
      useFactory: (
        quoteRepo,
        settingsRepo,
        orderRepo,
        idGenerator,
        clock,
        customerQuery,
        idempotency,
        audit,
        invoiceCommands
      ) =>
        new AcceptQuoteUseCase({
          logger: new NestLoggerAdapter(),
          quoteRepo,
          settingsRepo,
          orderRepo,
          idGenerator,
          clock,
          customerQuery,
          idempotency,
          audit,
          invoiceCommands,
        }),
      inject: [
        QUOTE_REPOSITORY_PORT,
        SALES_SETTINGS_REPOSITORY_PORT,
        SALES_ORDER_REPOSITORY_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        CUSTOMER_QUERY_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        AUDIT_PORT,
        INVOICE_COMMANDS,
      ],
    },
    {
      provide: RejectQuoteUseCase,
      useFactory: (
        quoteRepo,
        settingsRepo,
        orderRepo,
        idGenerator,
        clock,
        customerQuery,
        idempotency,
        audit,
        invoiceCommands
      ) =>
        new RejectQuoteUseCase({
          logger: new NestLoggerAdapter(),
          quoteRepo,
          settingsRepo,
          orderRepo,
          idGenerator,
          clock,
          customerQuery,
          idempotency,
          audit,
          invoiceCommands,
        }),
      inject: [
        QUOTE_REPOSITORY_PORT,
        SALES_SETTINGS_REPOSITORY_PORT,
        SALES_ORDER_REPOSITORY_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        CUSTOMER_QUERY_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        AUDIT_PORT,
        INVOICE_COMMANDS,
      ],
    },
    {
      provide: ConvertQuoteToOrderUseCase,
      useFactory: (
        quoteRepo,
        settingsRepo,
        orderRepo,
        idGenerator,
        clock,
        customerQuery,
        idempotency,
        audit,
        invoiceCommands
      ) =>
        new ConvertQuoteToOrderUseCase({
          logger: new NestLoggerAdapter(),
          quoteRepo,
          settingsRepo,
          orderRepo,
          idGenerator,
          clock,
          customerQuery,
          idempotency,
          audit,
          invoiceCommands,
        }),
      inject: [
        QUOTE_REPOSITORY_PORT,
        SALES_SETTINGS_REPOSITORY_PORT,
        SALES_ORDER_REPOSITORY_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        CUSTOMER_QUERY_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        AUDIT_PORT,
        INVOICE_COMMANDS,
      ],
    },
    {
      provide: ConvertQuoteToInvoiceUseCase,
      useFactory: (
        quoteRepo,
        settingsRepo,
        orderRepo,
        idGenerator,
        clock,
        customerQuery,
        idempotency,
        audit,
        invoiceCommands
      ) =>
        new ConvertQuoteToInvoiceUseCase({
          logger: new NestLoggerAdapter(),
          quoteRepo,
          settingsRepo,
          orderRepo,
          idGenerator,
          clock,
          customerQuery,
          idempotency,
          audit,
          invoiceCommands,
        }),
      inject: [
        QUOTE_REPOSITORY_PORT,
        SALES_SETTINGS_REPOSITORY_PORT,
        SALES_ORDER_REPOSITORY_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        CUSTOMER_QUERY_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        AUDIT_PORT,
        INVOICE_COMMANDS,
      ],
    },
    {
      provide: GetQuoteUseCase,
      useFactory: (
        quoteRepo,
        settingsRepo,
        orderRepo,
        idGenerator,
        clock,
        customerQuery,
        idempotency,
        audit,
        invoiceCommands
      ) =>
        new GetQuoteUseCase({
          logger: new NestLoggerAdapter(),
          quoteRepo,
          settingsRepo,
          orderRepo,
          idGenerator,
          clock,
          customerQuery,
          idempotency,
          audit,
          invoiceCommands,
        }),
      inject: [
        QUOTE_REPOSITORY_PORT,
        SALES_SETTINGS_REPOSITORY_PORT,
        SALES_ORDER_REPOSITORY_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        CUSTOMER_QUERY_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        AUDIT_PORT,
        INVOICE_COMMANDS,
      ],
    },
    {
      provide: ListQuotesUseCase,
      useFactory: (
        quoteRepo,
        settingsRepo,
        orderRepo,
        idGenerator,
        clock,
        customerQuery,
        idempotency,
        audit,
        invoiceCommands
      ) =>
        new ListQuotesUseCase({
          logger: new NestLoggerAdapter(),
          quoteRepo,
          settingsRepo,
          orderRepo,
          idGenerator,
          clock,
          customerQuery,
          idempotency,
          audit,
          invoiceCommands,
        }),
      inject: [
        QUOTE_REPOSITORY_PORT,
        SALES_SETTINGS_REPOSITORY_PORT,
        SALES_ORDER_REPOSITORY_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        CUSTOMER_QUERY_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        AUDIT_PORT,
        INVOICE_COMMANDS,
      ],
    },

    {
      provide: CreateSalesOrderUseCase,
      useFactory: (
        orderRepo,
        settingsRepo,
        idGenerator,
        clock,
        customerQuery,
        idempotency,
        audit,
        invoiceCommands
      ) =>
        new CreateSalesOrderUseCase({
          logger: new NestLoggerAdapter(),
          orderRepo,
          settingsRepo,
          idGenerator,
          clock,
          customerQuery,
          idempotency,
          audit,
          invoiceCommands,
        }),
      inject: [
        SALES_ORDER_REPOSITORY_PORT,
        SALES_SETTINGS_REPOSITORY_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        CUSTOMER_QUERY_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        AUDIT_PORT,
        INVOICE_COMMANDS,
      ],
    },
    {
      provide: UpdateSalesOrderUseCase,
      useFactory: (
        orderRepo,
        settingsRepo,
        idGenerator,
        clock,
        customerQuery,
        idempotency,
        audit,
        invoiceCommands
      ) =>
        new UpdateSalesOrderUseCase({
          logger: new NestLoggerAdapter(),
          orderRepo,
          settingsRepo,
          idGenerator,
          clock,
          customerQuery,
          idempotency,
          audit,
          invoiceCommands,
        }),
      inject: [
        SALES_ORDER_REPOSITORY_PORT,
        SALES_SETTINGS_REPOSITORY_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        CUSTOMER_QUERY_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        AUDIT_PORT,
        INVOICE_COMMANDS,
      ],
    },
    {
      provide: ConfirmSalesOrderUseCase,
      useFactory: (
        orderRepo,
        settingsRepo,
        idGenerator,
        clock,
        customerQuery,
        idempotency,
        audit,
        invoiceCommands
      ) =>
        new ConfirmSalesOrderUseCase({
          logger: new NestLoggerAdapter(),
          orderRepo,
          settingsRepo,
          idGenerator,
          clock,
          customerQuery,
          idempotency,
          audit,
          invoiceCommands,
        }),
      inject: [
        SALES_ORDER_REPOSITORY_PORT,
        SALES_SETTINGS_REPOSITORY_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        CUSTOMER_QUERY_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        AUDIT_PORT,
        INVOICE_COMMANDS,
      ],
    },
    {
      provide: FulfillSalesOrderUseCase,
      useFactory: (
        orderRepo,
        settingsRepo,
        idGenerator,
        clock,
        customerQuery,
        idempotency,
        audit,
        invoiceCommands
      ) =>
        new FulfillSalesOrderUseCase({
          logger: new NestLoggerAdapter(),
          orderRepo,
          settingsRepo,
          idGenerator,
          clock,
          customerQuery,
          idempotency,
          audit,
          invoiceCommands,
        }),
      inject: [
        SALES_ORDER_REPOSITORY_PORT,
        SALES_SETTINGS_REPOSITORY_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        CUSTOMER_QUERY_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        AUDIT_PORT,
        INVOICE_COMMANDS,
      ],
    },
    {
      provide: CancelSalesOrderUseCase,
      useFactory: (
        orderRepo,
        settingsRepo,
        idGenerator,
        clock,
        customerQuery,
        idempotency,
        audit,
        invoiceCommands
      ) =>
        new CancelSalesOrderUseCase({
          logger: new NestLoggerAdapter(),
          orderRepo,
          settingsRepo,
          idGenerator,
          clock,
          customerQuery,
          idempotency,
          audit,
          invoiceCommands,
        }),
      inject: [
        SALES_ORDER_REPOSITORY_PORT,
        SALES_SETTINGS_REPOSITORY_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        CUSTOMER_QUERY_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        AUDIT_PORT,
        INVOICE_COMMANDS,
      ],
    },
    {
      provide: CreateInvoiceFromOrderUseCase,
      useFactory: (
        orderRepo,
        settingsRepo,
        idGenerator,
        clock,
        customerQuery,
        idempotency,
        audit,
        invoiceCommands
      ) =>
        new CreateInvoiceFromOrderUseCase({
          logger: new NestLoggerAdapter(),
          orderRepo,
          settingsRepo,
          idGenerator,
          clock,
          customerQuery,
          idempotency,
          audit,
          invoiceCommands,
        }),
      inject: [
        SALES_ORDER_REPOSITORY_PORT,
        SALES_SETTINGS_REPOSITORY_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        CUSTOMER_QUERY_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        AUDIT_PORT,
        INVOICE_COMMANDS,
      ],
    },
    {
      provide: GetSalesOrderUseCase,
      useFactory: (
        orderRepo,
        settingsRepo,
        idGenerator,
        clock,
        customerQuery,
        idempotency,
        audit,
        invoiceCommands
      ) =>
        new GetSalesOrderUseCase({
          logger: new NestLoggerAdapter(),
          orderRepo,
          settingsRepo,
          idGenerator,
          clock,
          customerQuery,
          idempotency,
          audit,
          invoiceCommands,
        }),
      inject: [
        SALES_ORDER_REPOSITORY_PORT,
        SALES_SETTINGS_REPOSITORY_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        CUSTOMER_QUERY_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        AUDIT_PORT,
        INVOICE_COMMANDS,
      ],
    },
    {
      provide: ListSalesOrdersUseCase,
      useFactory: (
        orderRepo,
        settingsRepo,
        idGenerator,
        clock,
        customerQuery,
        idempotency,
        audit,
        invoiceCommands
      ) =>
        new ListSalesOrdersUseCase({
          logger: new NestLoggerAdapter(),
          orderRepo,
          settingsRepo,
          idGenerator,
          clock,
          customerQuery,
          idempotency,
          audit,
          invoiceCommands,
        }),
      inject: [
        SALES_ORDER_REPOSITORY_PORT,
        SALES_SETTINGS_REPOSITORY_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        CUSTOMER_QUERY_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        AUDIT_PORT,
        INVOICE_COMMANDS,
      ],
    },

    {
      provide: GetSalesSettingsUseCase,
      useFactory: (settingsRepo, idGenerator, clock, idempotency, audit) =>
        new GetSalesSettingsUseCase({
          logger: new NestLoggerAdapter(),
          settingsRepo,
          idGenerator,
          clock,
          idempotency,
          audit,
        }),
      inject: [
        SALES_SETTINGS_REPOSITORY_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: UpdateSalesSettingsUseCase,
      useFactory: (settingsRepo, idGenerator, clock, idempotency, audit) =>
        new UpdateSalesSettingsUseCase({
          logger: new NestLoggerAdapter(),
          settingsRepo,
          idGenerator,
          clock,
          idempotency,
          audit,
        }),
      inject: [
        SALES_SETTINGS_REPOSITORY_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },

    {
      provide: SalesApplication,
      useFactory: (
        createQuote,
        updateQuote,
        sendQuote,
        acceptQuote,
        rejectQuote,
        convertQuoteToOrder,
        convertQuoteToInvoice,
        getQuote,
        listQuotes,
        createOrder,
        updateOrder,
        confirmOrder,
        fulfillOrder,
        cancelOrder,
        createInvoiceFromOrder,
        getOrder,
        listOrders,
        getSettings,
        updateSettings
      ) =>
        new SalesApplication(
          createQuote,
          updateQuote,
          sendQuote,
          acceptQuote,
          rejectQuote,
          convertQuoteToOrder,
          convertQuoteToInvoice,
          getQuote,
          listQuotes,
          createOrder,
          updateOrder,
          confirmOrder,
          fulfillOrder,
          cancelOrder,
          createInvoiceFromOrder,
          getOrder,
          listOrders,
          getSettings,
          updateSettings
        ),
      inject: [
        CreateQuoteUseCase,
        UpdateQuoteUseCase,
        SendQuoteUseCase,
        AcceptQuoteUseCase,
        RejectQuoteUseCase,
        ConvertQuoteToOrderUseCase,
        ConvertQuoteToInvoiceUseCase,
        GetQuoteUseCase,
        ListQuotesUseCase,
        CreateSalesOrderUseCase,
        UpdateSalesOrderUseCase,
        ConfirmSalesOrderUseCase,
        FulfillSalesOrderUseCase,
        CancelSalesOrderUseCase,
        CreateInvoiceFromOrderUseCase,
        GetSalesOrderUseCase,
        ListSalesOrdersUseCase,
        GetSalesSettingsUseCase,
        UpdateSalesSettingsUseCase,
      ],
    },
  ],
  exports: [SalesApplication],
})
export class SalesModule {}
