import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { PrismaService } from "@corely/data";
import { OUTBOX_PORT, AUDIT_PORT } from "@corely/kernel";
import type { OutboxPort, AuditPort } from "@corely/kernel";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { InvoicesHttpController } from "./adapters/http/invoices.controller";
import { InvoicesPublicController } from "./adapters/http/invoices-public.controller";
import { InvoicesInternalController } from "./adapters/http/invoices-internal.controller";
import { InvoicesCopilotController } from "./adapters/http/invoices-copilot.controller";
import { ResendWebhookController } from "./adapters/webhooks/resend-webhook.controller";
import {
  PrismaInvoiceEmailDeliveryAdapter,
  PrismaInvoiceReminderStateAdapter,
  PrismaInvoiceReminderSettingsAdapter,
} from "@corely/data";
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
import { PlatformModule } from "../platform";
import { AccountingModule } from "../accounting/accounting.module";
import { TaxEngineService } from "../tax/application/services/tax-engine.service";
import { CancelInvoiceUseCase } from "./application/use-cases/cancel-invoice/cancel-invoice.usecase";
import { CreateInvoiceUseCase } from "./application/use-cases/create-invoice/create-invoice.usecase";
import { FinalizeInvoiceUseCase } from "./application/use-cases/finalize-invoice/finalize-invoice.usecase";
import { GetInvoiceByIdUseCase } from "./application/use-cases/get-invoice-by-id/get-invoice-by-id.usecase";
import { ListInvoicesUseCase } from "./application/use-cases/list-invoices/list-invoices.usecase";
import { RecordPaymentUseCase } from "./application/use-cases/record-payment/record-payment.usecase";
import { SendInvoiceUseCase } from "./application/use-cases/send-invoice/send-invoice.usecase";
import { SendInvoiceRemindersUseCase } from "./application/use-cases/send-invoice-reminders/send-invoice-reminders.usecase";
import { UpdateInvoiceUseCase } from "./application/use-cases/update-invoice/update-invoice.usecase";
import { DraftInvoiceEmailUseCase } from "./application/use-cases/copilot/draft-invoice-email.usecase";
import { DraftReminderEmailUseCase } from "./application/use-cases/copilot/draft-reminder-email.usecase";
import { PrismaInvoiceRepoAdapter } from "./infrastructure/adapters/prisma-invoice-repository.adapter";
import { PrismaInvoiceCopilotRateLimitAdapter } from "./infrastructure/adapters/prisma-invoice-copilot-rate-limit.adapter";
import { INVOICE_COMMANDS } from "./application/ports/invoice-commands.port";
import { InvoiceCommandService } from "./application/services/invoice-command.service";
import { INVOICE_COPILOT_RATE_LIMIT_PORT } from "./application/ports/invoice-copilot-rate-limit.port";
import type { InvoiceCopilotRateLimitPort } from "./application/ports/invoice-copilot-rate-limit.port";
import { CogsPostingService } from "../accounting/application/services/cogs-posting.service";
import {
  INVOICE_REMINDER_STATE_PORT,
  type InvoiceReminderStatePort,
  INVOICE_REMINDER_SETTINGS_PORT,
  type InvoiceReminderSettingsPort,
} from "@corely/kernel";
import { AI_TEXT_PORT } from "../../shared/ai/ai-text.port";
import { AiSdkTextAdapter } from "../../shared/ai/ai-sdk-text.adapter";
import type { AiTextPort } from "../../shared/ai/ai-text.port";

@Module({
  imports: [
    DataModule,
    KernelModule,
    IdentityModule,
    PartyModule,
    DocumentsModule,
    TaxModule,
    PlatformModule,
    AccountingModule,
  ],
  controllers: [
    InvoicesHttpController,
    InvoicesPublicController,
    InvoicesInternalController,
    InvoicesCopilotController,
    ResendWebhookController,
  ],
  providers: [
    PrismaInvoiceRepoAdapter,
    PrismaInvoiceCopilotRateLimitAdapter,
    PrismaTenantTimeZoneAdapter,
    AiSdkTextAdapter,
    { provide: AI_TEXT_PORT, useExisting: AiSdkTextAdapter },
    {
      provide: INVOICE_COPILOT_RATE_LIMIT_PORT,
      useExisting: PrismaInvoiceCopilotRateLimitAdapter,
    },
    { provide: TENANT_TIMEZONE_PORT, useExisting: PrismaTenantTimeZoneAdapter },
    {
      provide: TimeService,
      useFactory: (clock: any, tenantTz: PrismaTenantTimeZoneAdapter) =>
        new TimeService(clock, tenantTz),
      inject: [CLOCK_PORT_TOKEN, TENANT_TIMEZONE_PORT],
    },
    { provide: INVOICE_NUMBERING_PORT, useClass: InvoiceNumberingAdapter },
    PrismaInvoiceEmailDeliveryAdapter,
    PrismaInvoiceReminderStateAdapter,
    PrismaInvoiceReminderSettingsAdapter,
    { provide: INVOICE_REMINDER_STATE_PORT, useExisting: PrismaInvoiceReminderStateAdapter },
    { provide: INVOICE_REMINDER_SETTINGS_PORT, useExisting: PrismaInvoiceReminderSettingsAdapter },
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
        taxEngine: TaxEngineService,
        prisma: PrismaService,
        cogsPostingService: CogsPostingService
      ) =>
        new FinalizeInvoiceUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          numbering,
          clock,
          customerQuery,
          paymentMethodQuery,
          taxEngine,
          prisma,
          cogsPostingService,
        }),
      inject: [
        PrismaInvoiceRepoAdapter,
        INVOICE_NUMBERING_PORT,
        CLOCK_PORT_TOKEN,
        CUSTOMER_QUERY_PORT,
        PAYMENT_METHOD_QUERY_PORT,
        TaxEngineService,
        PrismaService,
        CogsPostingService,
      ],
    },
    {
      provide: SendInvoiceUseCase,
      useFactory: (
        repo: PrismaInvoiceRepoAdapter,
        deliveryRepo: PrismaInvoiceEmailDeliveryAdapter,
        outbox: OutboxPort,
        idGen: any,
        clock: any,
        reminderState: InvoiceReminderStatePort,
        reminderSettings: InvoiceReminderSettingsPort,
        audit: AuditPort,
        tenantTimeZone: any
      ) =>
        new SendInvoiceUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          deliveryRepo,
          outbox,
          idGenerator: idGen,
          clock,
          reminderState,
          reminderSettings,
          audit,
          tenantTimeZone,
        }),
      inject: [
        PrismaInvoiceRepoAdapter,
        PrismaInvoiceEmailDeliveryAdapter,
        OUTBOX_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        INVOICE_REMINDER_STATE_PORT,
        INVOICE_REMINDER_SETTINGS_PORT,
        AUDIT_PORT,
        TENANT_TIMEZONE_PORT,
      ],
    },
    {
      provide: SendInvoiceRemindersUseCase,
      useFactory: (
        repo: PrismaInvoiceRepoAdapter,
        sendInvoice: SendInvoiceUseCase,
        clock: any,
        reminderState: InvoiceReminderStatePort,
        reminderSettings: InvoiceReminderSettingsPort,
        idGen: any,
        audit: AuditPort,
        tenantTimeZone: any
      ) =>
        new SendInvoiceRemindersUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          sendInvoice,
          clock,
          reminderState,
          reminderSettings,
          idGenerator: idGen,
          audit,
          tenantTimeZone,
        }),
      inject: [
        PrismaInvoiceRepoAdapter,
        SendInvoiceUseCase,
        CLOCK_PORT_TOKEN,
        INVOICE_REMINDER_STATE_PORT,
        INVOICE_REMINDER_SETTINGS_PORT,
        ID_GENERATOR_TOKEN,
        AUDIT_PORT,
        TENANT_TIMEZONE_PORT,
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
      provide: DraftInvoiceEmailUseCase,
      useFactory: (
        repo: PrismaInvoiceRepoAdapter,
        aiText: AiTextPort,
        audit: AuditPort,
        rateLimit: InvoiceCopilotRateLimitPort
      ) =>
        new DraftInvoiceEmailUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          aiText,
          audit,
          rateLimit,
        }),
      inject: [PrismaInvoiceRepoAdapter, AI_TEXT_PORT, AUDIT_PORT, INVOICE_COPILOT_RATE_LIMIT_PORT],
    },
    {
      provide: DraftReminderEmailUseCase,
      useFactory: (
        repo: PrismaInvoiceRepoAdapter,
        aiText: AiTextPort,
        audit: AuditPort,
        rateLimit: InvoiceCopilotRateLimitPort
      ) =>
        new DraftReminderEmailUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          aiText,
          audit,
          rateLimit,
        }),
      inject: [PrismaInvoiceRepoAdapter, AI_TEXT_PORT, AUDIT_PORT, INVOICE_COPILOT_RATE_LIMIT_PORT],
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
        draftIssueEmail: DraftInvoiceEmailUseCase,
        draftReminderEmail: DraftReminderEmailUseCase
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
          draftIssueEmail,
          draftReminderEmail
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
        DraftInvoiceEmailUseCase,
        DraftReminderEmailUseCase,
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
