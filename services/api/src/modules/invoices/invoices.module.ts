import { Module, Logger, InternalServerErrorException } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { OUTBOX_PORT } from "@corely/kernel";
import type { OutboxPort } from "@corely/kernel";
import { chromium } from "playwright";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { InvoicesHttpController } from "./adapters/http/invoices.controller";
import { ResendWebhookController } from "./adapters/webhooks/resend-webhook.controller";
import { PrismaInvoiceEmailDeliveryRepoAdapter } from "./infrastructure/prisma/prisma-invoice-email-delivery-repo.adapter";
import { InvoicesApplication } from "./application/invoices.application";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import {
  INVOICE_NUMBERING_PORT,
  InvoiceNumberingPort,
} from "./application/ports/invoice-numbering.port";
import { CUSTOMER_QUERY_PORT, CustomerQueryPort } from "./application/ports/customer-query.port";
import { PAYMENT_METHOD_QUERY_PORT } from "./application/ports/payment-method-query.port";
import { PrismaPaymentMethodQueryAdapter } from "./infrastructure/adapters/prisma-payment-method-query.adapter";
import { LEGAL_ENTITY_QUERY_PORT } from "./application/ports/legal-entity-query.port";
import { PrismaLegalEntityQueryAdapter } from "./infrastructure/adapters/legal-entity-query.adapter";
import { INVOICE_PDF_MODEL_PORT } from "./application/ports/invoice-pdf-model.port";
import { INVOICE_PDF_RENDERER_PORT } from "./application/ports/invoice-pdf-renderer.port";
import { CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import { InvoiceNumberingAdapter } from "./infrastructure/prisma/prisma-numbering.adapter";
import { IdentityModule } from "../identity";
import { TimeService } from "@corely/kernel";
import { PrismaTenantTimeZoneAdapter } from "../../shared/infrastructure/time/prisma-tenant-timezone.adapter";
import { TENANT_TIMEZONE_PORT } from "../../shared/time/tenant-timezone.token";
import { PartyModule } from "../party";
import { DocumentsModule } from "../documents";
import { TaxModule } from "../tax/tax.module";
import { TaxEngineService } from "../tax/application/services/tax-engine.service";
import { CancelInvoiceUseCase } from "./application/use-cases/cancel-invoice/cancel-invoice.usecase";
import { CreateInvoiceUseCase } from "./application/use-cases/create-invoice/create-invoice.usecase";
import { FinalizeInvoiceUseCase } from "./application/use-cases/finalize-invoice/finalize-invoice.usecase";
import { GetInvoiceByIdUseCase } from "./application/use-cases/get-invoice-by-id/get-invoice-by-id.usecase";
import { ListInvoicesUseCase } from "./application/use-cases/list-invoices/list-invoices.usecase";
import { RecordPaymentUseCase } from "./application/use-cases/record-payment/record-payment.usecase";
import { SendInvoiceUseCase } from "./application/use-cases/send-invoice/send-invoice.usecase";
import { UpdateInvoiceUseCase } from "./application/use-cases/update-invoice/update-invoice.usecase";
import { DownloadInvoicePdfUseCase } from "./application/use-cases/download-invoice-pdf/download-invoice-pdf.usecase";
import { PrismaInvoiceRepoAdapter } from "./infrastructure/adapters/prisma-invoice-repository.adapter";
import { PrismaInvoicePdfModelAdapter } from "./infrastructure/pdf/prisma-invoice-pdf-model.adapter";
import { PlaywrightInvoicePdfRendererAdapter } from "./infrastructure/pdf/playwright-invoice-pdf-renderer.adapter";
import { GcsObjectStorageAdapter } from "../documents/infrastructure/storage/gcs/gcs-object-storage.adapter";
import { INVOICE_COMMANDS } from "./application/ports/invoice-commands.port";
import { InvoiceCommandService } from "./application/services/invoice-command.service";

@Module({
  imports: [DataModule, KernelModule, IdentityModule, PartyModule, DocumentsModule, TaxModule],
  controllers: [InvoicesHttpController, ResendWebhookController],
  providers: [
    PrismaInvoiceRepoAdapter,
    PrismaTenantTimeZoneAdapter,
    { provide: TENANT_TIMEZONE_PORT, useExisting: PrismaTenantTimeZoneAdapter },
    {
      provide: TimeService,
      useFactory: (clock: any, tenantTz: PrismaTenantTimeZoneAdapter) =>
        new TimeService(clock, tenantTz),
      inject: [CLOCK_PORT_TOKEN, TENANT_TIMEZONE_PORT],
    },
    { provide: INVOICE_NUMBERING_PORT, useClass: InvoiceNumberingAdapter },
    { provide: INVOICE_PDF_MODEL_PORT, useClass: PrismaInvoicePdfModelAdapter },
    {
      provide: "PLAYWRIGHT_BROWSER",
      useFactory: async () => {
        // Skip browser launch in test or production (Docker image lacks browser binaries)
        if (
          process.env.NODE_ENV === "test" ||
          process.env.NODE_ENV === "production" ||
          process.env.CORELY_TEST === "true"
        ) {
          const logger = new Logger("PlaywrightBrowser");
          if (process.env.NODE_ENV === "production") {
            logger.warn(
              "Playwright browser disabled in production. PDF generation will be unavailable."
            );
          }
          return {
            async newPage() {
              if (process.env.NODE_ENV === "production") {
                throw new InternalServerErrorException(
                  "PDF generation is unavailable in production. Use a dedicated PDF service."
                );
              }
              return {
                async setContent() {},
                async pdf() {
                  return Buffer.from("");
                },
                async close() {},
              };
            },
          };
        }

        try {
          return await chromium.launch({ headless: true });
        } catch (error) {
          const logger = new Logger("PlaywrightBrowser");
          logger.error(
            "Failed to launch Playwright browser. PDF generation will be unavailable.",
            error instanceof Error ? error.stack : error
          );

          // Return a safe fallback to prevent app crash
          return {
            newPage: async () => {
              throw new InternalServerErrorException(
                "PDF generation is unavailable because the browser failed to launch on startup."
              );
            },
            close: async () => {},
          } as any;
        }
      },
    },
    {
      provide: INVOICE_PDF_RENDERER_PORT,
      useFactory: (browser: any) => new PlaywrightInvoicePdfRendererAdapter(browser),
      inject: ["PLAYWRIGHT_BROWSER"],
    },
    PrismaInvoiceEmailDeliveryRepoAdapter,
    PrismaPaymentMethodQueryAdapter,
    { provide: PAYMENT_METHOD_QUERY_PORT, useExisting: PrismaPaymentMethodQueryAdapter },
    PrismaLegalEntityQueryAdapter,
    { provide: LEGAL_ENTITY_QUERY_PORT, useExisting: PrismaLegalEntityQueryAdapter },
    {
      provide: CreateInvoiceUseCase,
      useFactory: (
        repo: PrismaInvoiceRepoAdapter,
        idGen: any,
        clock: any,
        timeService: TimeService,
        customerQuery: CustomerQueryPort,
        legalEntityQuery: any,
        paymentMethodQuery: any
      ) =>
        new CreateInvoiceUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          idGenerator: idGen,
          clock,
          timeService,
          customerQuery,
          legalEntityQuery,
          paymentMethodQuery,
        }),
      inject: [
        PrismaInvoiceRepoAdapter,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        TimeService,
        CUSTOMER_QUERY_PORT,
        LEGAL_ENTITY_QUERY_PORT,
        PAYMENT_METHOD_QUERY_PORT,
      ],
    },
    {
      provide: UpdateInvoiceUseCase,
      useFactory: (
        repo: PrismaInvoiceRepoAdapter,
        idGen: any,
        clock: any,
        customerQuery: CustomerQueryPort,
        legalEntityQuery: any,
        paymentMethodQuery: any
      ) =>
        new UpdateInvoiceUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          idGenerator: idGen,
          clock,
          customerQuery,
          legalEntityQuery,
          paymentMethodQuery,
        }),
      inject: [
        PrismaInvoiceRepoAdapter,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        CUSTOMER_QUERY_PORT,
        LEGAL_ENTITY_QUERY_PORT,
        PAYMENT_METHOD_QUERY_PORT,
      ],
    },
    {
      provide: FinalizeInvoiceUseCase,
      useFactory: (
        repo: PrismaInvoiceRepoAdapter,
        numbering: InvoiceNumberingPort,
        clock: any,
        customerQuery: CustomerQueryPort,
        paymentMethodQuery: any,
        taxEngine: TaxEngineService
      ) =>
        new FinalizeInvoiceUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          numbering,
          clock,
          customerQuery,
          paymentMethodQuery,
          taxEngine,
        }),
      inject: [
        PrismaInvoiceRepoAdapter,
        INVOICE_NUMBERING_PORT,
        CLOCK_PORT_TOKEN,
        CUSTOMER_QUERY_PORT,
        PAYMENT_METHOD_QUERY_PORT,
        TaxEngineService,
      ],
    },
    {
      provide: SendInvoiceUseCase,
      useFactory: (
        repo: PrismaInvoiceRepoAdapter,
        deliveryRepo: PrismaInvoiceEmailDeliveryRepoAdapter,
        outbox: OutboxPort,
        idGen: any
      ) =>
        new SendInvoiceUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          deliveryRepo,
          outbox,
          idGenerator: idGen,
        }),
      inject: [
        PrismaInvoiceRepoAdapter,
        PrismaInvoiceEmailDeliveryRepoAdapter,
        OUTBOX_PORT,
        ID_GENERATOR_TOKEN,
      ],
    },
    {
      provide: RecordPaymentUseCase,
      useFactory: (repo: PrismaInvoiceRepoAdapter, idGen: any, clock: any) =>
        new RecordPaymentUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          idGenerator: idGen,
          clock,
        }),
      inject: [PrismaInvoiceRepoAdapter, ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN],
    },
    {
      provide: CancelInvoiceUseCase,
      useFactory: (repo: PrismaInvoiceRepoAdapter, clock: any) =>
        new CancelInvoiceUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          clock,
        }),
      inject: [PrismaInvoiceRepoAdapter, CLOCK_PORT_TOKEN],
    },
    {
      provide: GetInvoiceByIdUseCase,
      useFactory: (repo: PrismaInvoiceRepoAdapter) =>
        new GetInvoiceByIdUseCase({ logger: new NestLoggerAdapter(), invoiceRepo: repo }),
      inject: [PrismaInvoiceRepoAdapter],
    },
    {
      provide: ListInvoicesUseCase,
      useFactory: (repo: PrismaInvoiceRepoAdapter, timeService: TimeService) =>
        new ListInvoicesUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          timeService,
        }),
      inject: [PrismaInvoiceRepoAdapter, TimeService],
    },
    {
      provide: DownloadInvoicePdfUseCase,
      useFactory: (
        repo: PrismaInvoiceRepoAdapter,
        pdfModel: any,
        renderer: any,
        storage: GcsObjectStorageAdapter
      ) =>
        new DownloadInvoicePdfUseCase(repo, pdfModel, renderer, storage, new NestLoggerAdapter()),
      inject: [
        PrismaInvoiceRepoAdapter,
        INVOICE_PDF_MODEL_PORT,
        INVOICE_PDF_RENDERER_PORT,
        GcsObjectStorageAdapter,
      ],
    },
    {
      provide: InvoicesApplication,
      useFactory: (
        createInvoice: CreateInvoiceUseCase,
        updateInvoice: UpdateInvoiceUseCase,
        finalizeInvoice: FinalizeInvoiceUseCase,
        sendInvoice: SendInvoiceUseCase,
        recordPayment: RecordPaymentUseCase,
        cancelInvoice: CancelInvoiceUseCase,
        getInvoice: GetInvoiceByIdUseCase,
        listInvoices: ListInvoicesUseCase,
        downloadPdf: DownloadInvoicePdfUseCase
      ) =>
        new InvoicesApplication(
          createInvoice,
          updateInvoice,
          finalizeInvoice,
          sendInvoice,
          recordPayment,
          cancelInvoice,
          getInvoice,
          listInvoices,
          downloadPdf
        ),
      inject: [
        CreateInvoiceUseCase,
        UpdateInvoiceUseCase,
        FinalizeInvoiceUseCase,
        SendInvoiceUseCase,
        RecordPaymentUseCase,
        CancelInvoiceUseCase,
        GetInvoiceByIdUseCase,
        ListInvoicesUseCase,
        DownloadInvoicePdfUseCase,
      ],
    },
    {
      provide: INVOICE_COMMANDS,
      useClass: InvoiceCommandService,
    },
  ],
  exports: [InvoicesApplication, INVOICE_COMMANDS],
})
export class InvoicesModule {}
