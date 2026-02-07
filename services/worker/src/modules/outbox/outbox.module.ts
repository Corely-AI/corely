import { Module } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { OutboxRepository } from "@corely/data";
import { InvoiceEmailRequestedHandler } from "../invoices/invoice-email-requested.handler";
import { InvoicePdfRenderRequestedHandler } from "../invoices/handlers/invoice-pdf-render-requested.handler";
import { PrismaInvoiceEmailRepository } from "../invoices/infrastructure/prisma-invoice-email-repository.adapter";
import { EMAIL_SENDER_PORT, EmailSenderPort } from "../notifications/ports/email-sender.port";
import { ResendEmailSenderAdapter } from "../notifications/infrastructure/resend/resend-email-sender.adapter";
import { OutboxPollerService } from "./outbox-poller.service";

import { CashEntryCreatedHandler } from "../accounting/handlers/cash-entry-created.handler";
import { AccountingWorkerModule } from "../accounting/accounting-worker.module";
import { IssuesWorkerModule } from "../issues/issues-worker.module";
import { IssueTranscriptionRequestedHandler } from "../issues/issue-transcription-requested.handler";
import { InvoicesWorkerModule } from "../invoices/invoices-worker.module";
import { TaxWorkerModule } from "../tax/tax-worker.module";
import { TaxReportPdfRequestedHandler } from "../tax/handlers/tax-report-pdf-requested.handler";
import { FormsEventHandler } from "../forms/forms-event.handler";
import { FormsWorkerModule } from "../forms/forms-worker.module";

@Module({
  imports: [
    AccountingWorkerModule,
    IssuesWorkerModule,
    InvoicesWorkerModule,
    TaxWorkerModule,
    FormsWorkerModule,
  ],
  providers: [
    {
      provide: EMAIL_SENDER_PORT,
      useFactory: (env: EnvService) => {
        const provider = env.EMAIL_PROVIDER;
        if (provider !== "resend") {
          throw new Error(`Unsupported email provider: ${provider}`);
        }
        return new ResendEmailSenderAdapter(
          env.RESEND_API_KEY,
          env.RESEND_FROM,
          env.RESEND_REPLY_TO
        );
      },
      inject: [EnvService],
    },
    {
      provide: InvoiceEmailRequestedHandler,
      useFactory: (sender: EmailSenderPort, repo: PrismaInvoiceEmailRepository) =>
        new InvoiceEmailRequestedHandler(sender, repo),
      inject: [EMAIL_SENDER_PORT, PrismaInvoiceEmailRepository],
    },
    PrismaInvoiceEmailRepository,
    {
      provide: OutboxPollerService,
      useFactory: (
        repo: OutboxRepository,
        invoiceHandler: InvoiceEmailRequestedHandler,
        invoicePdfHandler: InvoicePdfRenderRequestedHandler,
        cashEntryHandler: CashEntryCreatedHandler,
        issueTranscriptionHandler: IssueTranscriptionRequestedHandler,
        taxReportPdfHandler: TaxReportPdfRequestedHandler,
        formsHandler: FormsEventHandler
      ) => {
        return new OutboxPollerService(repo, [
          invoiceHandler,
          invoicePdfHandler,
          cashEntryHandler,
          issueTranscriptionHandler,
          taxReportPdfHandler,
          formsHandler,
        ]);
      },
      inject: [
        OutboxRepository,
        InvoiceEmailRequestedHandler,
        InvoicePdfRenderRequestedHandler,
        CashEntryCreatedHandler,
        IssueTranscriptionRequestedHandler,
        TaxReportPdfRequestedHandler,
        FormsEventHandler,
      ],
    },
  ],
})
export class OutboxModule {}
