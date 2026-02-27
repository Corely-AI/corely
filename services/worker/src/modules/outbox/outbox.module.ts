import { Module } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  OutboxRepository,
  PrismaDocumentRepoAdapter,
  PrismaFileRepoAdapter,
  PrismaInvoiceEmailDeliveryAdapter,
} from "@corely/data";
import { EnvService } from "@corely/config";
import { InvoiceEmailRequestedHandler } from "../invoices/invoice-email-requested.handler";
import { InvoicePdfRenderRequestedHandler } from "../invoices/handlers/invoice-pdf-render-requested.handler";
import { PrismaInvoiceEmailRepository } from "../invoices/infrastructure/prisma-invoice-email-repository.adapter";
import {
  EMAIL_SENDER_PORT,
  ID_GENERATOR_TOKEN,
  OBJECT_STORAGE_PORT,
  type EmailSenderPort,
  type IdGeneratorPort,
  type ObjectStoragePort,
} from "@corely/kernel";
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
import { PlatformEntityDeletedHandler } from "../platform-custom-attributes/adapters/platform-entity-deleted.handler";
import { DirectoryWorkerModule } from "../directory/directory-worker.module";
import { DirectoryLeadCreatedHandler } from "../directory/handlers/directory-lead-created.handler";
import { NotificationIntentHandler } from "../notifications/handlers/notification-intent.handler";

// ... imports

@Module({
  imports: [
    AccountingWorkerModule,
    IssuesWorkerModule,
    InvoicesWorkerModule,
    TaxWorkerModule,
    FormsWorkerModule,
    ClassesWorkerModule,
    DirectoryWorkerModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: ID_GENERATOR_TOKEN,
      useFactory: (): IdGeneratorPort => ({
        newId: () => randomUUID(),
      }),
    },
    ClassesInvoiceReadyToSendHandler,
    PlatformEntityDeletedHandler,
    {
      provide: InvoiceEmailRequestedHandler,
      useFactory: (
        sender: EmailSenderPort,
        repo: PrismaInvoiceEmailRepository,
        deliveryRepo: PrismaInvoiceEmailDeliveryAdapter,
        documentRepo: PrismaDocumentRepoAdapter,
        fileRepo: PrismaFileRepoAdapter,
        objectStorage: ObjectStoragePort
      ) =>
        new InvoiceEmailRequestedHandler(
          sender,
          repo,
          deliveryRepo,
          documentRepo,
          fileRepo,
          objectStorage
        ),
      inject: [
        EMAIL_SENDER_PORT,
        PrismaInvoiceEmailRepository,
        PrismaInvoiceEmailDeliveryAdapter,
        PrismaDocumentRepoAdapter,
        PrismaFileRepoAdapter,
        OBJECT_STORAGE_PORT,
      ],
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
        classesHandler: ClassesInvoiceReadyToSendHandler,
        platformEntityDeletedHandler: PlatformEntityDeletedHandler,
        directoryLeadCreatedHandler: DirectoryLeadCreatedHandler,
        notificationIntentHandler: NotificationIntentHandler
      ) => {
        return new OutboxPollerService(repo, env, [
          invoiceHandler,
          invoicePdfHandler,
          cashEntryHandler,
          issueTranscriptionHandler,
          taxReportPdfHandler,
          formsHandler,
          classesHandler,
          platformEntityDeletedHandler,
          directoryLeadCreatedHandler,
          notificationIntentHandler,
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
        PlatformEntityDeletedHandler,
        DirectoryLeadCreatedHandler,
        NotificationIntentHandler,
      ],
    },
  ],
  exports: [OutboxPollerService],
})
export class OutboxModule {}
