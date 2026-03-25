import { Module, forwardRef } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { GcsObjectStorageAdapter } from "@corely/storage";
import {
  AUDIT_PORT,
  CLOCK_PORT_TOKEN,
  ID_GENERATOR_TOKEN,
  IDEMPOTENCY_PORT,
  OBJECT_STORAGE_PORT,
  OUTBOX_PORT,
  UNIT_OF_WORK,
  type AuditPort,
  type ClockPort,
  type IdGeneratorPort,
  type IdempotencyPort,
  type OutboxPort,
  type UnitOfWorkPort,
} from "@corely/kernel";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { IdentityModule } from "../identity/identity.module";
import { PartyModule } from "../party/party.module";
import { PartyApplication } from "../party/application/party.application";
import {
  CUSTOMER_QUERY_PORT,
  type CustomerQueryPort,
} from "../party/application/ports/customer-query.port";
import { DocumentsModule } from "../documents/documents.module";
import { DocumentsApplication } from "../documents/application/documents.application";
import { InvoicesModule } from "../invoices/invoices.module";
import { InvoicesApplication } from "../invoices/application/invoices.application";
import { PlatformModule } from "../platform/platform.module";
import { CoachingEngagementsApplication } from "./application/coaching-engagements.application";
import { PrismaCoachingEngagementRepositoryAdapter } from "./infrastructure/persist/prisma-coaching-engagement-repository.adapter";
import { CoachingArtifactService } from "./infrastructure/documents/coaching-artifact.service";
import { StripeCoachingPaymentProviderAdapter } from "./infrastructure/payments/stripe-coaching-payment-provider.adapter";
import { FakeStripeCoachingPaymentProviderAdapter } from "./infrastructure/payments/fake-stripe-coaching-payment-provider.adapter";
import { CoachingPaymentProviderRegistryService } from "./infrastructure/payments/coaching-payment-provider-registry.service";
import { CreateCoachingOfferUseCase } from "./application/use-cases/create-coaching-offer.usecase";
import { ListCoachingOffersUseCase } from "./application/use-cases/list-coaching-offers.usecase";
import { GetCoachingOfferUseCase } from "./application/use-cases/get-coaching-offer.usecase";
import { UpdateCoachingOfferUseCase } from "./application/use-cases/update-coaching-offer.usecase";
import { ArchiveCoachingOfferUseCase } from "./application/use-cases/archive-coaching-offer.usecase";
import { BookCoachingEngagementUseCase } from "./application/use-cases/book-coaching-engagement.usecase";
import { GetCoachingEngagementUseCase } from "./application/use-cases/get-coaching-engagement.usecase";
import { ListCoachingEngagementsUseCase } from "./application/use-cases/list-coaching-engagements.usecase";
import { ListCoachingSessionsUseCase } from "./application/use-cases/list-coaching-sessions.usecase";
import { CreateCoachingCheckoutSessionUseCase } from "./application/use-cases/create-coaching-checkout-session.usecase";
import { GetCoachingContractViewUseCase } from "./application/use-cases/get-coaching-contract-view.usecase";
import { ProcessCoachingPaymentWebhookUseCase } from "./application/use-cases/process-coaching-payment-webhook.usecase";
import { StartCoachingPublicBookingUseCase } from "./application/use-cases/start-coaching-public-booking.usecase";
import { RefundCoachingPaymentUseCase } from "./application/use-cases/refund-coaching-payment.usecase";
import { ResendCoachingInvoiceUseCase } from "./application/use-cases/resend-coaching-invoice.usecase";
import { SignCoachingContractUseCase } from "./application/use-cases/sign-coaching-contract.usecase";
import { GetCoachingPrepFormUseCase } from "./application/use-cases/get-coaching-prep-form.usecase";
import { SubmitCoachingPrepFormUseCase } from "./application/use-cases/submit-coaching-prep-form.usecase";
import { CompleteCoachingSessionUseCase } from "./application/use-cases/complete-coaching-session.usecase";
import { GetCoachingDebriefFormUseCase } from "./application/use-cases/get-coaching-debrief-form.usecase";
import { SubmitCoachingDebriefUseCase } from "./application/use-cases/submit-coaching-debrief.usecase";
import { GenerateCoachingExportBundleUseCase } from "./application/use-cases/generate-coaching-export-bundle.usecase";
import { GetCoachingArtifactSummaryUseCase } from "./application/use-cases/get-coaching-artifact-summary.usecase";
import { CoachingEngagementsController } from "./http/coaching-engagements.controller";
import { CoachingEngagementsPublicController } from "./http/coaching-engagements-public.controller";
import { CoachingEngagementsWebhookController } from "./http/coaching-engagements-webhook.controller";
import { CoachingOffersController } from "./http/coaching-offers.controller";

@Module({
  imports: [
    DataModule,
    KernelModule,
    forwardRef(() => IdentityModule),
    forwardRef(() => PartyModule),
    forwardRef(() => DocumentsModule),
    forwardRef(() => InvoicesModule),
    forwardRef(() => PlatformModule),
  ],
  controllers: [
    CoachingOffersController,
    CoachingEngagementsController,
    CoachingEngagementsPublicController,
    CoachingEngagementsWebhookController,
  ],
  providers: [
    NestLoggerAdapter,
    PrismaCoachingEngagementRepositoryAdapter,
    CoachingArtifactService,
    StripeCoachingPaymentProviderAdapter,
    FakeStripeCoachingPaymentProviderAdapter,
    CoachingPaymentProviderRegistryService,
    { provide: "coaching-engagements/logger", useExisting: NestLoggerAdapter },
    { provide: OBJECT_STORAGE_PORT, useExisting: GcsObjectStorageAdapter },
    {
      provide: "coaching-engagements/repo",
      useExisting: PrismaCoachingEngagementRepositoryAdapter,
    },
    {
      provide: "coaching-engagements/payment-provider-registry",
      useExisting: CoachingPaymentProviderRegistryService,
    },
    {
      provide: CreateCoachingOfferUseCase,
      useFactory: (
        repo: PrismaCoachingEngagementRepositoryAdapter,
        idGenerator: IdGeneratorPort,
        clock: ClockPort,
        audit: AuditPort,
        outbox: OutboxPort,
        idempotency: IdempotencyPort,
        uow: UnitOfWorkPort,
        logger: NestLoggerAdapter
      ) =>
        new CreateCoachingOfferUseCase({
          logger,
          repo,
          idGenerator,
          clock,
          audit,
          outbox,
          idempotency,
          uow,
        }),
      inject: [
        PrismaCoachingEngagementRepositoryAdapter,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
        OUTBOX_PORT,
        IDEMPOTENCY_PORT,
        UNIT_OF_WORK,
        NestLoggerAdapter,
      ],
    },
    {
      provide: ListCoachingOffersUseCase,
      useFactory: (repo: PrismaCoachingEngagementRepositoryAdapter, logger: NestLoggerAdapter) =>
        new ListCoachingOffersUseCase({ logger, repo }),
      inject: [PrismaCoachingEngagementRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: GetCoachingOfferUseCase,
      useFactory: (repo: PrismaCoachingEngagementRepositoryAdapter, logger: NestLoggerAdapter) =>
        new GetCoachingOfferUseCase({ logger, repo }),
      inject: [PrismaCoachingEngagementRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: UpdateCoachingOfferUseCase,
      useFactory: (
        repo: PrismaCoachingEngagementRepositoryAdapter,
        clock: ClockPort,
        audit: AuditPort,
        logger: NestLoggerAdapter
      ) => new UpdateCoachingOfferUseCase({ logger, repo, clock, audit }),
      inject: [
        PrismaCoachingEngagementRepositoryAdapter,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
        NestLoggerAdapter,
      ],
    },
    {
      provide: ArchiveCoachingOfferUseCase,
      useFactory: (
        repo: PrismaCoachingEngagementRepositoryAdapter,
        clock: ClockPort,
        audit: AuditPort,
        logger: NestLoggerAdapter
      ) => new ArchiveCoachingOfferUseCase({ logger, repo, clock, audit }),
      inject: [
        PrismaCoachingEngagementRepositoryAdapter,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
        NestLoggerAdapter,
      ],
    },
    {
      provide: BookCoachingEngagementUseCase,
      useFactory: (
        repo: PrismaCoachingEngagementRepositoryAdapter,
        customerQuery: CustomerQueryPort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort,
        audit: AuditPort,
        outbox: OutboxPort,
        idempotency: IdempotencyPort,
        uow: UnitOfWorkPort,
        logger: NestLoggerAdapter
      ) =>
        new BookCoachingEngagementUseCase({
          logger,
          repo,
          customerQuery,
          idGenerator,
          clock,
          audit,
          outbox,
          idempotency,
          uow,
        }),
      inject: [
        PrismaCoachingEngagementRepositoryAdapter,
        CUSTOMER_QUERY_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
        OUTBOX_PORT,
        IDEMPOTENCY_PORT,
        UNIT_OF_WORK,
        NestLoggerAdapter,
      ],
    },
    {
      provide: ListCoachingEngagementsUseCase,
      useFactory: (repo: PrismaCoachingEngagementRepositoryAdapter, logger: NestLoggerAdapter) =>
        new ListCoachingEngagementsUseCase({ logger, repo }),
      inject: [PrismaCoachingEngagementRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: ListCoachingSessionsUseCase,
      useFactory: (repo: PrismaCoachingEngagementRepositoryAdapter, logger: NestLoggerAdapter) =>
        new ListCoachingSessionsUseCase({ logger, repo }),
      inject: [PrismaCoachingEngagementRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: GetCoachingArtifactSummaryUseCase,
      useFactory: (
        repo: PrismaCoachingEngagementRepositoryAdapter,
        documents: DocumentsApplication,
        logger: NestLoggerAdapter
      ) => new GetCoachingArtifactSummaryUseCase({ logger, repo, documents }),
      inject: [PrismaCoachingEngagementRepositoryAdapter, DocumentsApplication, NestLoggerAdapter],
    },
    {
      provide: GetCoachingEngagementUseCase,
      useFactory: (
        repo: PrismaCoachingEngagementRepositoryAdapter,
        documents: DocumentsApplication,
        summary: GetCoachingArtifactSummaryUseCase,
        logger: NestLoggerAdapter
      ) => new GetCoachingEngagementUseCase({ logger, repo, documents, summary }),
      inject: [
        PrismaCoachingEngagementRepositoryAdapter,
        DocumentsApplication,
        GetCoachingArtifactSummaryUseCase,
        NestLoggerAdapter,
      ],
    },
    {
      provide: CreateCoachingCheckoutSessionUseCase,
      useFactory: (
        repo: PrismaCoachingEngagementRepositoryAdapter,
        paymentProviders: CoachingPaymentProviderRegistryService,
        customerQuery: CustomerQueryPort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort,
        audit: AuditPort,
        logger: NestLoggerAdapter
      ) =>
        new CreateCoachingCheckoutSessionUseCase({
          logger,
          repo,
          paymentProviders,
          customerQuery,
          idGenerator,
          clock,
          audit,
        }),
      inject: [
        PrismaCoachingEngagementRepositoryAdapter,
        CoachingPaymentProviderRegistryService,
        CUSTOMER_QUERY_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
        NestLoggerAdapter,
      ],
    },
    {
      provide: StartCoachingPublicBookingUseCase,
      useFactory: (
        repo: PrismaCoachingEngagementRepositoryAdapter,
        party: PartyApplication,
        bookEngagement: BookCoachingEngagementUseCase,
        paymentProviders: CoachingPaymentProviderRegistryService,
        idGenerator: IdGeneratorPort,
        clock: ClockPort,
        audit: AuditPort,
        logger: NestLoggerAdapter
      ) =>
        new StartCoachingPublicBookingUseCase({
          logger,
          repo,
          party,
          bookEngagement,
          paymentProviders,
          idGenerator,
          clock,
          audit,
        }),
      inject: [
        PrismaCoachingEngagementRepositoryAdapter,
        PartyApplication,
        BookCoachingEngagementUseCase,
        CoachingPaymentProviderRegistryService,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
        NestLoggerAdapter,
      ],
    },
    ProcessCoachingPaymentWebhookUseCase,
    {
      provide: RefundCoachingPaymentUseCase,
      useFactory: (
        repo: PrismaCoachingEngagementRepositoryAdapter,
        paymentProviders: CoachingPaymentProviderRegistryService,
        idGenerator: IdGeneratorPort,
        clock: ClockPort,
        audit: AuditPort,
        logger: NestLoggerAdapter
      ) =>
        new RefundCoachingPaymentUseCase({
          logger,
          repo,
          paymentProviders,
          idGenerator,
          clock,
          audit,
        }),
      inject: [
        PrismaCoachingEngagementRepositoryAdapter,
        CoachingPaymentProviderRegistryService,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
        NestLoggerAdapter,
      ],
    },
    {
      provide: ResendCoachingInvoiceUseCase,
      useFactory: (
        repo: PrismaCoachingEngagementRepositoryAdapter,
        invoices: InvoicesApplication,
        clock: ClockPort,
        audit: AuditPort,
        logger: NestLoggerAdapter
      ) =>
        new ResendCoachingInvoiceUseCase({
          logger,
          repo,
          invoices,
          clock,
          audit,
        }),
      inject: [
        PrismaCoachingEngagementRepositoryAdapter,
        InvoicesApplication,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
        NestLoggerAdapter,
      ],
    },
    {
      provide: GetCoachingContractViewUseCase,
      useFactory: (
        repo: PrismaCoachingEngagementRepositoryAdapter,
        clock: ClockPort,
        logger: NestLoggerAdapter
      ) =>
        new GetCoachingContractViewUseCase({
          logger,
          repo,
          clock,
        }),
      inject: [PrismaCoachingEngagementRepositoryAdapter, CLOCK_PORT_TOKEN, NestLoggerAdapter],
    },
    {
      provide: SignCoachingContractUseCase,
      useFactory: (
        repo: PrismaCoachingEngagementRepositoryAdapter,
        artifactService: CoachingArtifactService,
        idGenerator: IdGeneratorPort,
        clock: ClockPort,
        audit: AuditPort,
        outbox: OutboxPort,
        uow: UnitOfWorkPort,
        logger: NestLoggerAdapter
      ) =>
        new SignCoachingContractUseCase({
          logger,
          repo,
          artifactService,
          idGenerator,
          clock,
          audit,
          outbox,
          uow,
        }),
      inject: [
        PrismaCoachingEngagementRepositoryAdapter,
        CoachingArtifactService,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
        OUTBOX_PORT,
        UNIT_OF_WORK,
        NestLoggerAdapter,
      ],
    },
    {
      provide: GetCoachingPrepFormUseCase,
      useFactory: (repo: PrismaCoachingEngagementRepositoryAdapter, logger: NestLoggerAdapter) =>
        new GetCoachingPrepFormUseCase({ logger, repo }),
      inject: [PrismaCoachingEngagementRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: SubmitCoachingPrepFormUseCase,
      useFactory: (
        repo: PrismaCoachingEngagementRepositoryAdapter,
        artifactService: CoachingArtifactService,
        idGenerator: IdGeneratorPort,
        clock: ClockPort,
        audit: AuditPort,
        outbox: OutboxPort,
        uow: UnitOfWorkPort,
        logger: NestLoggerAdapter
      ) =>
        new SubmitCoachingPrepFormUseCase({
          logger,
          repo,
          artifactService,
          idGenerator,
          clock,
          audit,
          outbox,
          uow,
        }),
      inject: [
        PrismaCoachingEngagementRepositoryAdapter,
        CoachingArtifactService,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
        OUTBOX_PORT,
        UNIT_OF_WORK,
        NestLoggerAdapter,
      ],
    },
    {
      provide: CompleteCoachingSessionUseCase,
      useFactory: (
        repo: PrismaCoachingEngagementRepositoryAdapter,
        artifactService: CoachingArtifactService,
        idGenerator: IdGeneratorPort,
        clock: ClockPort,
        audit: AuditPort,
        outbox: OutboxPort,
        idempotency: IdempotencyPort,
        uow: UnitOfWorkPort,
        logger: NestLoggerAdapter
      ) =>
        new CompleteCoachingSessionUseCase({
          logger,
          repo,
          artifactService,
          idGenerator,
          clock,
          audit,
          outbox,
          idempotency,
          uow,
        }),
      inject: [
        PrismaCoachingEngagementRepositoryAdapter,
        CoachingArtifactService,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
        OUTBOX_PORT,
        IDEMPOTENCY_PORT,
        UNIT_OF_WORK,
        NestLoggerAdapter,
      ],
    },
    {
      provide: GetCoachingDebriefFormUseCase,
      useFactory: (repo: PrismaCoachingEngagementRepositoryAdapter, logger: NestLoggerAdapter) =>
        new GetCoachingDebriefFormUseCase({ logger, repo }),
      inject: [PrismaCoachingEngagementRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: SubmitCoachingDebriefUseCase,
      useFactory: (
        repo: PrismaCoachingEngagementRepositoryAdapter,
        artifactService: CoachingArtifactService,
        idGenerator: IdGeneratorPort,
        clock: ClockPort,
        audit: AuditPort,
        outbox: OutboxPort,
        uow: UnitOfWorkPort,
        logger: NestLoggerAdapter
      ) =>
        new SubmitCoachingDebriefUseCase({
          logger,
          repo,
          artifactService,
          idGenerator,
          clock,
          audit,
          outbox,
          uow,
        }),
      inject: [
        PrismaCoachingEngagementRepositoryAdapter,
        CoachingArtifactService,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
        OUTBOX_PORT,
        UNIT_OF_WORK,
        NestLoggerAdapter,
      ],
    },
    {
      provide: GenerateCoachingExportBundleUseCase,
      useFactory: (
        repo: PrismaCoachingEngagementRepositoryAdapter,
        idGenerator: IdGeneratorPort,
        clock: ClockPort,
        audit: AuditPort,
        outbox: OutboxPort,
        idempotency: IdempotencyPort,
        uow: UnitOfWorkPort,
        logger: NestLoggerAdapter
      ) =>
        new GenerateCoachingExportBundleUseCase({
          logger,
          repo,
          idGenerator,
          clock,
          audit,
          outbox,
          idempotency,
          uow,
        }),
      inject: [
        PrismaCoachingEngagementRepositoryAdapter,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
        OUTBOX_PORT,
        IDEMPOTENCY_PORT,
        UNIT_OF_WORK,
        NestLoggerAdapter,
      ],
    },
    {
      provide: CoachingEngagementsApplication,
      useFactory: (
        createOffer: CreateCoachingOfferUseCase,
        listOffers: ListCoachingOffersUseCase,
        getOffer: GetCoachingOfferUseCase,
        updateOffer: UpdateCoachingOfferUseCase,
        archiveOffer: ArchiveCoachingOfferUseCase,
        bookEngagement: BookCoachingEngagementUseCase,
        getEngagement: GetCoachingEngagementUseCase,
        listEngagements: ListCoachingEngagementsUseCase,
        listSessions: ListCoachingSessionsUseCase,
        createCheckoutSession: CreateCoachingCheckoutSessionUseCase,
        getContractView: GetCoachingContractViewUseCase,
        processPaymentWebhook: ProcessCoachingPaymentWebhookUseCase,
        startPublicBooking: StartCoachingPublicBookingUseCase,
        refundPayment: RefundCoachingPaymentUseCase,
        resendInvoice: ResendCoachingInvoiceUseCase,
        signContract: SignCoachingContractUseCase,
        getPrepForm: GetCoachingPrepFormUseCase,
        submitPrepForm: SubmitCoachingPrepFormUseCase,
        completeSession: CompleteCoachingSessionUseCase,
        getDebriefForm: GetCoachingDebriefFormUseCase,
        submitDebrief: SubmitCoachingDebriefUseCase,
        generateExportBundle: GenerateCoachingExportBundleUseCase,
        getArtifactSummary: GetCoachingArtifactSummaryUseCase
      ) =>
        new CoachingEngagementsApplication(
          createOffer,
          listOffers,
          getOffer,
          updateOffer,
          archiveOffer,
          bookEngagement,
          getEngagement,
          listEngagements,
          listSessions,
          createCheckoutSession,
          getContractView,
          processPaymentWebhook,
          startPublicBooking,
          refundPayment,
          resendInvoice,
          signContract,
          getPrepForm,
          submitPrepForm,
          completeSession,
          getDebriefForm,
          submitDebrief,
          generateExportBundle,
          getArtifactSummary
        ),
      inject: [
        CreateCoachingOfferUseCase,
        ListCoachingOffersUseCase,
        GetCoachingOfferUseCase,
        UpdateCoachingOfferUseCase,
        ArchiveCoachingOfferUseCase,
        BookCoachingEngagementUseCase,
        GetCoachingEngagementUseCase,
        ListCoachingEngagementsUseCase,
        ListCoachingSessionsUseCase,
        CreateCoachingCheckoutSessionUseCase,
        GetCoachingContractViewUseCase,
        ProcessCoachingPaymentWebhookUseCase,
        StartCoachingPublicBookingUseCase,
        RefundCoachingPaymentUseCase,
        ResendCoachingInvoiceUseCase,
        SignCoachingContractUseCase,
        GetCoachingPrepFormUseCase,
        SubmitCoachingPrepFormUseCase,
        CompleteCoachingSessionUseCase,
        GetCoachingDebriefFormUseCase,
        SubmitCoachingDebriefUseCase,
        GenerateCoachingExportBundleUseCase,
        GetCoachingArtifactSummaryUseCase,
      ],
    },
  ],
  exports: [
    CoachingEngagementsApplication,
    PrismaCoachingEngagementRepositoryAdapter,
    CoachingArtifactService,
  ],
})
export class CoachingEngagementsModule {}
