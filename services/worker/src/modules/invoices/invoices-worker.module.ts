import { Module, Logger, InternalServerErrorException, Inject } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { DataModule } from "@corely/data";
import { chromium, type Browser } from "playwright";
import { InvoiceReminderRunnerService } from "./invoice-reminder-runner.service";
import { InvoicePdfRenderRequestedHandler } from "./handlers/invoice-pdf-render-requested.handler";
import { GenerateInvoicePdfWorker } from "./workers/generate-invoice-pdf.worker";
import { PlaywrightInvoicePdfRendererAdapter } from "./pdf/playwright-invoice-pdf-renderer.adapter";
import { PlaywrightBrowserLifecycle } from "./pdf/playwright-browser.lifecycle";
import { PrismaInvoicePdfModelAdapter } from "./infrastructure/pdf/prisma-invoice-pdf-model.adapter";
import { OBJECT_STORAGE_PORT, type ObjectStoragePort } from "@corely/kernel";
import { InvoicePdfService } from "./application/invoice-pdf.service";
import { type InvoicePdfModelPort } from "./application/ports/invoice-pdf-model.port";
import { type InvoicePdfRendererPort } from "./application/ports/invoice-pdf-renderer.port";
import { INVOICE_PDF_MODEL_PORT, INVOICE_PDF_RENDERER_PORT } from "./tokens";

const DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT_MS = 10_000;

function resolveLaunchTimeoutMs(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT_MS;
}

async function launchBrowserWithTimeout(timeoutMs: number): Promise<Browser> {
  return await new Promise<Browser>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Playwright browser launch timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    chromium
      .launch({ headless: true })
      .then((browser) => {
        clearTimeout(timer);
        resolve(browser);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

@Module({
  imports: [DataModule],
  providers: [
    InvoiceReminderRunnerService,
    PrismaInvoicePdfModelAdapter,
    { provide: INVOICE_PDF_MODEL_PORT, useExisting: PrismaInvoicePdfModelAdapter },
    {
      provide: "PLAYWRIGHT_BROWSER",
      useFactory: (env: EnvService) => {
        const logger = new Logger("PlaywrightBrowser");
        const launchTimeoutMs = resolveLaunchTimeoutMs(
          process.env.PLAYWRIGHT_LAUNCH_TIMEOUT_MS ??
            process.env.WORKER_PLAYWRIGHT_LAUNCH_TIMEOUT_MS
        );
        let browserPromise: Promise<Browser> | null = null;

        const getBrowser = async (): Promise<Browser> => {
          if (!browserPromise) {
            logger.log(`Launching Playwright browser (timeout=${launchTimeoutMs}ms)`);
            browserPromise = launchBrowserWithTimeout(launchTimeoutMs)
              .then((browser) => {
                logger.log("Playwright browser launched successfully");
                return browser;
              })
              .catch((error) => {
                logger.error(
                  `Failed to launch Playwright browser within ${launchTimeoutMs}ms. PDF generation will be unavailable.`,
                  error instanceof Error ? error.stack : error
                );
                browserPromise = null;
                throw new InternalServerErrorException(
                  "PDF generation is unavailable because the browser failed to launch."
                );
              });
          }
          return browserPromise;
        };

        const lazyBrowser = {
          newPage: async () => {
            const browser = await getBrowser();
            return browser.newPage();
          },
          close: async () => {
            if (!browserPromise) {
              return;
            }
            const browser = await browserPromise.catch(() => null);
            browserPromise = null;
            if (browser) {
              await browser.close();
            }
          },
        };

        return lazyBrowser as unknown as Browser;
      },
      inject: [EnvService],
    },
    {
      provide: PlaywrightInvoicePdfRendererAdapter,
      useFactory: (browser: Browser) => new PlaywrightInvoicePdfRendererAdapter(browser),
      inject: ["PLAYWRIGHT_BROWSER"],
    },
    PlaywrightBrowserLifecycle,
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
