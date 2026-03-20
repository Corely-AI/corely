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
import { TaxReportEricJobRequestedHandler } from "../tax/handlers/tax-report-eric-job-requested.handler";
import { FormsEventHandler } from "../forms/forms-event.handler";
import { FormsWorkerModule } from "../forms/forms-worker.module";
import { ClassesInvoiceReadyToSendHandler } from "../classes/handlers/classes-invoice-ready-to-send.handler";
import { ClassesWorkerModule } from "../classes/classes-worker.module";
import { PlatformEntityDeletedHandler } from "../platform-custom-attributes/adapters/platform-entity-deleted.handler";
import { DirectoryWorkerModule } from "../directory/directory-worker.module";
import { DirectoryLeadCreatedHandler } from "../directory/handlers/directory-lead-created.handler";
import { NotificationIntentHandler } from "../notifications/handlers/notification-intent.handler";
import { CoachingEngagementsModule } from "../../../../coaching-engagements";
import { PartyModule } from "../../../../party";
import { DocumentsModule } from "../../../../documents";
import { InvoicesModule } from "../../../../invoices/invoices.module";
import { CoachingBookingRequestedHandler } from "../coaching/handlers/coaching-booking-requested.handler";
import { CoachingPaymentCapturedHandler } from "../coaching/handlers/coaching-payment-captured.handler";
import { CoachingContractSignedHandler } from "../coaching/handlers/coaching-contract-signed.handler";
import { CoachingPrepFormRequestedHandler } from "../coaching/handlers/coaching-prep-form-requested.handler";
import { CoachingPrepFormSubmittedHandler } from "../coaching/handlers/coaching-prep-form-submitted.handler";
import { CoachingSessionCompletedHandler } from "../coaching/handlers/coaching-session-completed.handler";
import { CoachingDebriefRequestedHandler } from "../coaching/handlers/coaching-debrief-requested.handler";
import { CoachingExportBundleRequestedHandler } from "../coaching/handlers/coaching-export-bundle-requested.handler";

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
    CoachingEngagementsModule,
    PartyModule,
    DocumentsModule,
    InvoicesModule,
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
    CoachingBookingRequestedHandler,
    CoachingPaymentCapturedHandler,
    CoachingContractSignedHandler,
    CoachingPrepFormRequestedHandler,
    CoachingPrepFormSubmittedHandler,
    CoachingSessionCompletedHandler,
    CoachingDebriefRequestedHandler,
    CoachingExportBundleRequestedHandler,
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
        taxReportEricHandler: TaxReportEricJobRequestedHandler,
        formsHandler: FormsEventHandler,
        classesHandler: ClassesInvoiceReadyToSendHandler,
        platformEntityDeletedHandler: PlatformEntityDeletedHandler,
        directoryLeadCreatedHandler: DirectoryLeadCreatedHandler,
        notificationIntentHandler: NotificationIntentHandler,
        coachingBookingRequestedHandler: CoachingBookingRequestedHandler,
        coachingPaymentCapturedHandler: CoachingPaymentCapturedHandler,
        coachingContractSignedHandler: CoachingContractSignedHandler,
        coachingPrepFormRequestedHandler: CoachingPrepFormRequestedHandler,
        coachingPrepFormSubmittedHandler: CoachingPrepFormSubmittedHandler,
        coachingSessionCompletedHandler: CoachingSessionCompletedHandler,
        coachingDebriefRequestedHandler: CoachingDebriefRequestedHandler,
        coachingExportBundleRequestedHandler: CoachingExportBundleRequestedHandler
      ) => {
        return new OutboxPollerService(repo, env, [
          invoiceHandler,
          invoicePdfHandler,
          cashEntryHandler,
          issueTranscriptionHandler,
          taxReportPdfHandler,
          taxReportEricHandler,
          formsHandler,
          classesHandler,
          platformEntityDeletedHandler,
          directoryLeadCreatedHandler,
          notificationIntentHandler,
          coachingBookingRequestedHandler,
          coachingPaymentCapturedHandler,
          coachingContractSignedHandler,
          coachingPrepFormRequestedHandler,
          coachingPrepFormSubmittedHandler,
          coachingSessionCompletedHandler,
          coachingDebriefRequestedHandler,
          coachingExportBundleRequestedHandler,
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
        TaxReportEricJobRequestedHandler,
        FormsEventHandler,
        ClassesInvoiceReadyToSendHandler,
        PlatformEntityDeletedHandler,
        DirectoryLeadCreatedHandler,
        NotificationIntentHandler,
        CoachingBookingRequestedHandler,
        CoachingPaymentCapturedHandler,
        CoachingContractSignedHandler,
        CoachingPrepFormRequestedHandler,
        CoachingPrepFormSubmittedHandler,
        CoachingSessionCompletedHandler,
        CoachingDebriefRequestedHandler,
        CoachingExportBundleRequestedHandler,
      ],
    },
  ],
  exports: [OutboxPollerService],
})
export class OutboxModule {}
