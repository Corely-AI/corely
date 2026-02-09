import { Module, Logger, InternalServerErrorException, Inject } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { DataModule } from "@corely/data";
import { chromium, type Browser } from "playwright";
import { InvoiceReminderRunnerService } from "./invoice-reminder-runner.service";
import { InvoicePdfRenderRequestedHandler } from "./handlers/invoice-pdf-render-requested.handler";
import { GenerateInvoicePdfWorker } from "./workers/generate-invoice-pdf.worker";
import { PlaywrightInvoicePdfRendererAdapter } from "./pdf/playwright-invoice-pdf-renderer.adapter";
import { PrismaInvoicePdfModelAdapter } from "./infrastructure/pdf/prisma-invoice-pdf-model.adapter";
import { OBJECT_STORAGE_PORT, type ObjectStoragePort } from "@corely/kernel";
import {
  PrismaDocumentRepoAdapter,
  PrismaFileRepoAdapter,
  PrismaDocumentLinkAdapter,
} from "@corely/data";
import { InvoicePdfService } from "./application/invoice-pdf.service";
import { type InvoicePdfModelPort } from "./application/ports/invoice-pdf-model.port";
import { type InvoicePdfRendererPort } from "./application/ports/invoice-pdf-renderer.port";
import { INVOICE_PDF_MODEL_PORT, INVOICE_PDF_RENDERER_PORT } from "./tokens";

@Module({
  imports: [DataModule],
  providers: [
    InvoiceReminderRunnerService,
    PrismaDocumentRepoAdapter,
    PrismaFileRepoAdapter,
    PrismaDocumentLinkAdapter,
    PrismaInvoicePdfModelAdapter,
    { provide: INVOICE_PDF_MODEL_PORT, useExisting: PrismaInvoicePdfModelAdapter },
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
    { provide: INVOICE_PDF_RENDERER_PORT, useExisting: PlaywrightInvoicePdfRendererAdapter },
    InvoicePdfService,
    GenerateInvoicePdfWorker,
    {
      provide: InvoicePdfRenderRequestedHandler,
      useFactory: (worker: GenerateInvoicePdfWorker) =>
        new InvoicePdfRenderRequestedHandler(worker),
      inject: [GenerateInvoicePdfWorker],
    },
  ],
  exports: [InvoicePdfRenderRequestedHandler, InvoiceReminderRunnerService, InvoicePdfService],
})
export class InvoicesWorkerModule {}
