import { Module } from "@nestjs/common";
import { OutboxRepository } from "@corely/data";
import { InvoiceEmailRequestedHandler } from "../invoices/invoice-email-requested.handler";
import { InvoicePdfRenderRequestedHandler } from "../invoices/handlers/invoice-pdf-render-requested.handler";
import { PrismaInvoiceEmailRepository } from "../invoices/infrastructure/prisma-invoice-email-repository.adapter";
import { EMAIL_SENDER_PORT, type EmailSenderPort } from "../notifications/ports/email-sender.port";
import { NotificationsModule } from "../notifications/notifications.module";
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
import { ClassesInvoiceReadyToSendHandler } from "../classes/handlers/classes-invoice-ready-to-send.handler";
import { ClassesWorkerModule } from "../classes/classes-worker.module";

import { EnvService } from "@corely/config";

// ... imports

@Module({
  imports: [
    AccountingWorkerModule,
    IssuesWorkerModule,
    InvoicesWorkerModule,
    TaxWorkerModule,
    FormsWorkerModule,
    ClassesWorkerModule,
    NotificationsModule,
  ],
  providers: [
    ClassesInvoiceReadyToSendHandler,
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
        env: EnvService,
        invoiceHandler: InvoiceEmailRequestedHandler,
        invoicePdfHandler: InvoicePdfRenderRequestedHandler,
        cashEntryHandler: CashEntryCreatedHandler,
        issueTranscriptionHandler: IssueTranscriptionRequestedHandler,
        taxReportPdfHandler: TaxReportPdfRequestedHandler,
        formsHandler: FormsEventHandler,
        classesHandler: ClassesInvoiceReadyToSendHandler
      ) => {
        return new OutboxPollerService(repo, env, [
          invoiceHandler,
          invoicePdfHandler,
          cashEntryHandler,
          issueTranscriptionHandler,
          taxReportPdfHandler,
          formsHandler,
          classesHandler,
        ]);
      },
      inject: [
        OutboxRepository,
        EnvService,
        InvoiceEmailRequestedHandler,
        InvoicePdfRenderRequestedHandler,
        CashEntryCreatedHandler,
        IssueTranscriptionRequestedHandler,
        TaxReportPdfRequestedHandler,
        FormsEventHandler,
        ClassesInvoiceReadyToSendHandler,
      ],
    },
  ],
  exports: [OutboxPollerService],
})
export class OutboxModule {}
