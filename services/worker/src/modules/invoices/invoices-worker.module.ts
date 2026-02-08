import { Module, Logger, InternalServerErrorException } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { DataModule } from "@corely/data";
import { chromium, type Browser } from "playwright";
import { InvoiceReminderRunnerService } from "./invoice-reminder-runner.service";
import { InvoicePdfRenderRequestedHandler } from "./handlers/invoice-pdf-render-requested.handler";
import { GenerateInvoicePdfWorker } from "./workers/generate-invoice-pdf.worker";
import { PlaywrightInvoicePdfRendererAdapter } from "./pdf/playwright-invoice-pdf-renderer.adapter";
import { PrismaInvoicePdfModelAdapter } from "@/modules/invoices/infrastructure/pdf/prisma-invoice-pdf-model.adapter";
import { PrismaDocumentRepoAdapter } from "@/modules/documents/infrastructure/prisma/prisma-document-repo.adapter";
import { PrismaFileRepoAdapter } from "@/modules/documents/infrastructure/prisma/prisma-file-repo.adapter";
import { GcsObjectStorageAdapter } from "@/modules/documents/infrastructure/storage/gcs/gcs-object-storage.adapter";
import { createGcsClient } from "@/modules/documents/infrastructure/storage/gcs/gcs.client";

@Module({
  imports: [DataModule],
  providers: [
    InvoiceReminderRunnerService,
    PrismaDocumentRepoAdapter,
    PrismaFileRepoAdapter,
    PrismaInvoicePdfModelAdapter,
    {
      provide: GcsObjectStorageAdapter,
      useFactory: (env: EnvService) => {
        const client = createGcsClient({
          projectId: env.GOOGLE_CLOUD_PROJECT,
          keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS,
        });
        return new GcsObjectStorageAdapter(client, env.STORAGE_BUCKET);
      },
      inject: [EnvService],
    },
    {
      provide: "PLAYWRIGHT_BROWSER",
      useFactory: async () => {
        try {
          return await chromium.launch({ headless: true });
        } catch (error) {
          const logger = new Logger("PlaywrightBrowser");
          logger.error(
            "Failed to launch Playwright browser. PDF generation will be unavailable.",
            error instanceof Error ? error.stack : error
          );
          return {
            newPage: async () => {
              throw new InternalServerErrorException(
                "PDF generation is unavailable because the browser failed to launch."
              );
            },
            close: async () => {},
          } as unknown as Browser;
        }
      },
    },
    {
      provide: PlaywrightInvoicePdfRendererAdapter,
      useFactory: (browser: Browser) => new PlaywrightInvoicePdfRendererAdapter(browser),
      inject: ["PLAYWRIGHT_BROWSER"],
    },
    {
      provide: GenerateInvoicePdfWorker,
      useFactory: (
        documentRepo: PrismaDocumentRepoAdapter,
        fileRepo: PrismaFileRepoAdapter,
        storage: GcsObjectStorageAdapter,
        invoiceModel: PrismaInvoicePdfModelAdapter,
        pdfRenderer: PlaywrightInvoicePdfRendererAdapter
      ) =>
        new GenerateInvoicePdfWorker({
          documentRepo,
          fileRepo,
          objectStorage: storage,
          invoicePdfModel: invoiceModel,
          pdfRenderer,
        }),
      inject: [
        PrismaDocumentRepoAdapter,
        PrismaFileRepoAdapter,
        GcsObjectStorageAdapter,
        PrismaInvoicePdfModelAdapter,
        PlaywrightInvoicePdfRendererAdapter,
      ],
    },
    {
      provide: InvoicePdfRenderRequestedHandler,
      useFactory: (worker: GenerateInvoicePdfWorker) =>
        new InvoicePdfRenderRequestedHandler(worker),
      inject: [GenerateInvoicePdfWorker],
    },
  ],
  exports: [InvoicePdfRenderRequestedHandler, InvoiceReminderRunnerService],
})
export class InvoicesWorkerModule {}
