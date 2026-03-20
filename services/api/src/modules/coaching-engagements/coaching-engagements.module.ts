import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import {
  AUDIT_PORT,
  CLOCK_PORT_TOKEN,
  ID_GENERATOR_TOKEN,
  IDEMPOTENCY_PORT,
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
import { PartyModule } from "../party";
import {
  CUSTOMER_QUERY_PORT,
  type CustomerQueryPort,
} from "../party/application/ports/customer-query.port";
import { DocumentsModule } from "../documents";
import { DocumentsApplication } from "../documents/application/documents.application";
import { InvoicesModule } from "../invoices/invoices.module";
import { CoachingEngagementsApplication } from "./application/coaching-engagements.application";
import { PrismaCoachingEngagementRepositoryAdapter } from "./infrastructure/persist/prisma-coaching-engagement-repository.adapter";
import { CoachingArtifactService } from "./infrastructure/documents/coaching-artifact.service";
import { StripeCoachingPaymentGatewayAdapter } from "./infrastructure/payments/stripe-coaching-payment-gateway.adapter";
import { BookCoachingEngagementUseCase } from "./application/use-cases/book-coaching-engagement.usecase";
import { GetCoachingEngagementUseCase } from "./application/use-cases/get-coaching-engagement.usecase";
import { ListCoachingEngagementsUseCase } from "./application/use-cases/list-coaching-engagements.usecase";
import { ListCoachingSessionsUseCase } from "./application/use-cases/list-coaching-sessions.usecase";
import { CreateCoachingCheckoutSessionUseCase } from "./application/use-cases/create-coaching-checkout-session.usecase";
import { ProcessCoachingStripeWebhookUseCase } from "./application/use-cases/process-coaching-stripe-webhook.usecase";
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

@Module({
  imports: [DataModule, PartyModule, DocumentsModule, InvoicesModule],
  controllers: [
    CoachingEngagementsController,
    CoachingEngagementsPublicController,
    CoachingEngagementsWebhookController,
  ],
  providers: [
    NestLoggerAdapter,
    PrismaCoachingEngagementRepositoryAdapter,
    CoachingArtifactService,
    StripeCoachingPaymentGatewayAdapter,
    { provide: "coaching-engagements/logger", useExisting: NestLoggerAdapter },
    {
      provide: "coaching-engagements/repo",
      useExisting: PrismaCoachingEngagementRepositoryAdapter,
    },
    {
      provide: "coaching-engagements/payment-gateway",
      useExisting: StripeCoachingPaymentGatewayAdapter,
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
        paymentGateway: StripeCoachingPaymentGatewayAdapter,
        customerQuery: CustomerQueryPort,
        clock: ClockPort,
        audit: AuditPort,
        logger: NestLoggerAdapter
      ) =>
        new CreateCoachingCheckoutSessionUseCase({
          logger,
          repo,
          paymentGateway,
          customerQuery,
          clock,
          audit,
        }),
      inject: [
        PrismaCoachingEngagementRepositoryAdapter,
        StripeCoachingPaymentGatewayAdapter,
        CUSTOMER_QUERY_PORT,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
        NestLoggerAdapter,
      ],
    },
    ProcessCoachingStripeWebhookUseCase,
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
        bookEngagement: BookCoachingEngagementUseCase,
        getEngagement: GetCoachingEngagementUseCase,
        listEngagements: ListCoachingEngagementsUseCase,
        listSessions: ListCoachingSessionsUseCase,
        createCheckoutSession: CreateCoachingCheckoutSessionUseCase,
        processStripeWebhook: ProcessCoachingStripeWebhookUseCase,
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
          bookEngagement,
          getEngagement,
          listEngagements,
          listSessions,
          createCheckoutSession,
          processStripeWebhook,
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
        BookCoachingEngagementUseCase,
        GetCoachingEngagementUseCase,
        ListCoachingEngagementsUseCase,
        ListCoachingSessionsUseCase,
        CreateCoachingCheckoutSessionUseCase,
        ProcessCoachingStripeWebhookUseCase,
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
