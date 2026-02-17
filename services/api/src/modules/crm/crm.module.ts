import { Module } from "@nestjs/common";
import {
  AUDIT_PORT,
  IDEMPOTENCY_PORT,
  OUTBOX_PORT,
  type AuditPort,
  type IdempotencyPort,
  type OutboxPort,
} from "@corely/kernel";
import { DataModule } from "@corely/data";
import { IdentityModule } from "../identity";
import { PlatformModule } from "../platform";
import { PartyModule } from "../party";
import { LeadsController } from "./adapters/http/leads.controller";
import { DealsHttpController } from "./adapters/http/deals.controller";
import {
  ActivitiesHttpController,
  TimelineHttpController,
} from "./adapters/http/activities.controller";
import {
  CommunicationsHttpController,
  CommunicationsWebhookController,
} from "./adapters/http/communications.controller";
import { PrismaDealRepoAdapter } from "./infrastructure/prisma/prisma-deal-repo.adapter";
import { PrismaActivityRepoAdapter } from "./infrastructure/prisma/prisma-activity-repo.adapter";
import { CLOCK_PORT_TOKEN, type ClockPort } from "../../shared/ports/clock.port";
import { ID_GENERATOR_TOKEN, type IdGeneratorPort } from "../../shared/ports/id-generator.port";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { CrmApplication } from "./application/crm.application";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { DEAL_REPO_PORT } from "./application/ports/deal-repository.port";
import { ACTIVITY_REPO_PORT } from "./application/ports/activity-repository.port";
import { CreateDealUseCase } from "./application/use-cases/create-deal/create-deal.usecase";
import { UpdateDealUseCase } from "./application/use-cases/update-deal/update-deal.usecase";
import { MoveDealStageUseCase } from "./application/use-cases/move-deal-stage/move-deal-stage.usecase";
import { MarkDealWonUseCase } from "./application/use-cases/mark-deal-won/mark-deal-won.usecase";
import { MarkDealLostUseCase } from "./application/use-cases/mark-deal-lost/mark-deal-lost.usecase";
import { ListDealsUseCase } from "./application/use-cases/list-deals/list-deals.usecase";
import { GetDealByIdUseCase } from "./application/use-cases/get-deal-by-id/get-deal-by-id.usecase";
import { CreateActivityUseCase } from "./application/use-cases/create-activity/create-activity.usecase";
import { UpdateActivityUseCase } from "./application/use-cases/update-activity/update-activity.usecase";
import { CompleteActivityUseCase } from "./application/use-cases/complete-activity/complete-activity.usecase";
import { ListActivitiesUseCase } from "./application/use-cases/list-activities/list-activities.usecase";
import { GetTimelineUseCase } from "./application/use-cases/get-timeline/get-timeline.usecase";
import { ChannelCatalogService } from "./application/channel-catalog.service";
import { ChannelsHttpController } from "./adapters/http/channels.controller";
import { LogMessageUseCase } from "./application/use-cases/log-message/log-message.usecase";
import { CreateCommunicationDraftUseCase } from "./application/use-cases/create-communication-draft/create-communication-draft.usecase";
import { SendCommunicationUseCase } from "./application/use-cases/send-communication/send-communication.usecase";
import { LogCommunicationUseCase } from "./application/use-cases/log-communication/log-communication.usecase";
import { ProcessCommunicationWebhookUseCase } from "./application/use-cases/process-communication-webhook/process-communication-webhook.usecase";
import { CreateLeadUseCase } from "./application/use-cases/create-lead/create-lead.usecase";
import { ConvertLeadUseCase } from "./application/use-cases/convert-lead/convert-lead.usecase";
import { ListLeadsUseCase } from "./application/use-cases/list-leads/list-leads.usecase";
import { GetLeadUseCase } from "./application/use-cases/get-lead/get-lead.usecase";
import { PrismaLeadRepoAdapter } from "./infrastructure/prisma/prisma-lead-repo.adapter";
import { LEAD_REPO_PORT } from "./application/ports/lead-repository.port";
import { PartyApplication } from "../party/application/party.application";
import { PlatformCustomAttributesModule } from "../platform-custom-attributes/platform-custom-attributes.module";

import { GetDealSummaryTool } from "./copilot/tools/get-deal-summary.tool";
import { COPILOT_TOOLS } from "../ai-copilot/application/ports/tool-registry.port";
import { SequencesInternalController } from "./adapters/http/sequences-internal.controller";
import { PrismaSequenceRepoAdapter } from "./infrastructure/prisma/prisma-sequence-repo.adapter";
import { PrismaEnrollmentRepoAdapter } from "./infrastructure/prisma/prisma-enrollment-repo.adapter";
import { EnrollEntityUseCase } from "./application/use-cases/enroll-entity/enroll-entity.usecase";
import { RunSequenceStepsUseCase } from "./application/use-cases/run-sequence-steps/run-sequence-steps.usecase";
import { SEQUENCE_REPO_PORT } from "./application/ports/sequence-repository.port";
import { ENROLLMENT_REPO_PORT } from "./application/ports/enrollment-repository.port";

import { CreateEmailDraftTool } from "./copilot/tools/create-email-draft.tool";
import { RecommendNextStepTool } from "./copilot/tools/recommend-next-step.tool";

import { SequencesHttpController } from "./adapters/http/sequences.controller";
import { CreateSequenceUseCase } from "./application/use-cases/create-sequence/create-sequence.usecase";
import { ListSequencesUseCase } from "./application/use-cases/list-sequences/list-sequences.usecase";

import { AccountsHttpController } from "./adapters/http/accounts.controller";
import { PrismaAccountRepoAdapter } from "./infrastructure/prisma/prisma-account-repo.adapter";
import { ACCOUNT_REPO_PORT } from "./application/ports/account-repository.port";
import { CreateAccountUseCase } from "./application/use-cases/create-account/create-account.usecase";
import { UpdateAccountUseCase } from "./application/use-cases/update-account/update-account.usecase";
import { GetAccountUseCase } from "./application/use-cases/get-account/get-account.usecase";
import { ListAccountsUseCase } from "./application/use-cases/list-accounts/list-accounts.usecase";
import { SetAccountCustomAttributesUseCase } from "./application/use-cases/set-account-custom-attributes/set-account-custom-attributes.usecase";
import { GetAccountCustomAttributesUseCase } from "./application/use-cases/get-account-custom-attributes/get-account-custom-attributes.usecase";

@Module({
  imports: [
    DataModule,
    IdentityModule,
    KernelModule,
    PlatformModule,
    PartyModule,
    PlatformCustomAttributesModule,
  ],
  controllers: [
    DealsHttpController,
    ActivitiesHttpController,
    TimelineHttpController,
    CommunicationsHttpController,
    CommunicationsWebhookController,
    ChannelsHttpController,
    LeadsController,
    SequencesInternalController,
    SequencesHttpController,
    AccountsHttpController,
  ],
  providers: [
    ChannelCatalogService,
    {
      provide: COPILOT_TOOLS,
      useClass: GetDealSummaryTool,
      multi: true,
    } as any,
    {
      provide: COPILOT_TOOLS,
      useClass: CreateEmailDraftTool,
      multi: true,
    } as any,
    {
      provide: COPILOT_TOOLS,
      useClass: RecommendNextStepTool,
      multi: true,
    } as any,
    EnrollEntityUseCase,
    RunSequenceStepsUseCase,
    CreateSequenceUseCase, // Add this
    ListSequencesUseCase,
    PrismaDealRepoAdapter,
    PrismaActivityRepoAdapter,
    { provide: DEAL_REPO_PORT, useExisting: PrismaDealRepoAdapter },
    { provide: ACTIVITY_REPO_PORT, useExisting: PrismaActivityRepoAdapter },
    PrismaLeadRepoAdapter,
    { provide: LEAD_REPO_PORT, useExisting: PrismaLeadRepoAdapter },
    PrismaSequenceRepoAdapter,
    PrismaEnrollmentRepoAdapter,
    { provide: SEQUENCE_REPO_PORT, useExisting: PrismaSequenceRepoAdapter },
    { provide: ENROLLMENT_REPO_PORT, useExisting: PrismaEnrollmentRepoAdapter },
    PrismaAccountRepoAdapter,
    { provide: ACCOUNT_REPO_PORT, useExisting: PrismaAccountRepoAdapter },
    {
      provide: CreateAccountUseCase,
      useFactory: (
        accountRepo: PrismaAccountRepoAdapter,
        partyApp: PartyApplication,
        clock: ClockPort,
        idGen: IdGeneratorPort,
        idempotency: IdempotencyPort,
        audit: AuditPort,
        outbox: OutboxPort
      ) =>
        new CreateAccountUseCase({
          accountRepo,
          partyApp,
          clock,
          idGenerator: idGen,
          logger: new NestLoggerAdapter(),
          idempotency,
          audit,
          outbox,
        }),
      inject: [
        ACCOUNT_REPO_PORT,
        PartyApplication,
        CLOCK_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        IDEMPOTENCY_PORT,
        AUDIT_PORT,
        OUTBOX_PORT,
      ],
    },
    {
      provide: UpdateAccountUseCase,
      useFactory: (
        accountRepo: PrismaAccountRepoAdapter,
        partyApp: PartyApplication,
        clock: ClockPort,
        idempotency: IdempotencyPort,
        audit: AuditPort,
        outbox: OutboxPort
      ) =>
        new UpdateAccountUseCase({
          accountRepo,
          partyApp,
          clock,
          logger: new NestLoggerAdapter(),
          idempotency,
          audit,
          outbox,
        }),
      inject: [
        ACCOUNT_REPO_PORT,
        PartyApplication,
        CLOCK_PORT_TOKEN,
        IDEMPOTENCY_PORT,
        AUDIT_PORT,
        OUTBOX_PORT,
      ],
    },
    {
      provide: GetAccountUseCase,
      useFactory: (accountRepo: PrismaAccountRepoAdapter) =>
        new GetAccountUseCase({ accountRepo, logger: new NestLoggerAdapter() }),
      inject: [ACCOUNT_REPO_PORT],
    },
    {
      provide: ListAccountsUseCase,
      useFactory: (accountRepo: PrismaAccountRepoAdapter) =>
        new ListAccountsUseCase({ accountRepo, logger: new NestLoggerAdapter() }),
      inject: [ACCOUNT_REPO_PORT],
    },
    SetAccountCustomAttributesUseCase,
    GetAccountCustomAttributesUseCase,
    {
      provide: CreateLeadUseCase,
      useFactory: (
        leadRepo: PrismaLeadRepoAdapter,
        clock: ClockPort,
        idGen: IdGeneratorPort,
        idempotency: IdempotencyPort,
        audit: AuditPort,
        outbox: OutboxPort
      ) =>
        new CreateLeadUseCase({
          leadRepo,
          clock,
          idGenerator: idGen,
          logger: new NestLoggerAdapter(),
          idempotency,
          audit,
          outbox,
        }),
      inject: [
        LEAD_REPO_PORT,
        CLOCK_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        IDEMPOTENCY_PORT,
        AUDIT_PORT,
        OUTBOX_PORT,
      ],
    },
    {
      provide: ConvertLeadUseCase,
      useFactory: (
        leadRepo: PrismaLeadRepoAdapter,
        partyApp: PartyApplication,
        createDeal: CreateDealUseCase,
        clock: ClockPort,
        idGen: IdGeneratorPort,
        idempotency: IdempotencyPort,
        audit: AuditPort,
        outbox: OutboxPort
      ) =>
        new ConvertLeadUseCase({
          leadRepo,
          partyApp,
          createDeal,
          clock,
          idGenerator: idGen,
          logger: new NestLoggerAdapter(),
          idempotency,
          audit,
          outbox,
        }),
      inject: [
        LEAD_REPO_PORT,
        PartyApplication,
        CreateDealUseCase,
        CLOCK_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        IDEMPOTENCY_PORT,
        AUDIT_PORT,
        OUTBOX_PORT,
      ],
    },
    ListLeadsUseCase,
    GetLeadUseCase,
    {
      provide: CreateDealUseCase,
      useFactory: (dealRepo: PrismaDealRepoAdapter, clock: ClockPort, idGen: IdGeneratorPort) =>
        new CreateDealUseCase(dealRepo, clock, idGen, new NestLoggerAdapter()),
      inject: [DEAL_REPO_PORT, CLOCK_PORT_TOKEN, ID_GENERATOR_TOKEN],
    },
    {
      provide: UpdateDealUseCase,
      useFactory: (dealRepo: PrismaDealRepoAdapter, clock: ClockPort) =>
        new UpdateDealUseCase(dealRepo, clock, new NestLoggerAdapter()),
      inject: [DEAL_REPO_PORT, CLOCK_PORT_TOKEN],
    },
    {
      provide: MoveDealStageUseCase,
      useFactory: (dealRepo: PrismaDealRepoAdapter, clock: ClockPort) =>
        new MoveDealStageUseCase(dealRepo, clock, new NestLoggerAdapter()),
      inject: [DEAL_REPO_PORT, CLOCK_PORT_TOKEN],
    },
    {
      provide: MarkDealWonUseCase,
      useFactory: (dealRepo: PrismaDealRepoAdapter, clock: ClockPort) =>
        new MarkDealWonUseCase(dealRepo, clock, new NestLoggerAdapter()),
      inject: [DEAL_REPO_PORT, CLOCK_PORT_TOKEN],
    },
    {
      provide: MarkDealLostUseCase,
      useFactory: (dealRepo: PrismaDealRepoAdapter, clock: ClockPort) =>
        new MarkDealLostUseCase(dealRepo, clock, new NestLoggerAdapter()),
      inject: [DEAL_REPO_PORT, CLOCK_PORT_TOKEN],
    },
    {
      provide: ListDealsUseCase,
      useFactory: (dealRepo: PrismaDealRepoAdapter) =>
        new ListDealsUseCase(dealRepo, new NestLoggerAdapter()),
      inject: [DEAL_REPO_PORT],
    },
    {
      provide: GetDealByIdUseCase,
      useFactory: (dealRepo: PrismaDealRepoAdapter) =>
        new GetDealByIdUseCase(dealRepo, new NestLoggerAdapter()),
      inject: [DEAL_REPO_PORT],
    },
    {
      provide: CreateActivityUseCase,
      useFactory: (
        activityRepo: PrismaActivityRepoAdapter,
        clock: ClockPort,
        idGen: IdGeneratorPort
      ) => new CreateActivityUseCase(activityRepo, clock, idGen, new NestLoggerAdapter()),
      inject: [ACTIVITY_REPO_PORT, CLOCK_PORT_TOKEN, ID_GENERATOR_TOKEN],
    },
    {
      provide: LogMessageUseCase,
      useFactory: (
        activityRepo: PrismaActivityRepoAdapter,
        clock: ClockPort,
        idGen: IdGeneratorPort
      ) => new LogMessageUseCase(activityRepo, clock, idGen, new NestLoggerAdapter()),
      inject: [ACTIVITY_REPO_PORT, CLOCK_PORT_TOKEN, ID_GENERATOR_TOKEN],
    },
    {
      provide: CreateCommunicationDraftUseCase,
      useFactory: (
        activityRepo: PrismaActivityRepoAdapter,
        clock: ClockPort,
        idGen: IdGeneratorPort
      ) => new CreateCommunicationDraftUseCase(activityRepo, clock, idGen, new NestLoggerAdapter()),
      inject: [ACTIVITY_REPO_PORT, CLOCK_PORT_TOKEN, ID_GENERATOR_TOKEN],
    },
    {
      provide: SendCommunicationUseCase,
      useFactory: (
        activityRepo: PrismaActivityRepoAdapter,
        clock: ClockPort,
        idGen: IdGeneratorPort
      ) => new SendCommunicationUseCase(activityRepo, clock, idGen, new NestLoggerAdapter()),
      inject: [ACTIVITY_REPO_PORT, CLOCK_PORT_TOKEN, ID_GENERATOR_TOKEN],
    },
    {
      provide: LogCommunicationUseCase,
      useFactory: (
        activityRepo: PrismaActivityRepoAdapter,
        clock: ClockPort,
        idGen: IdGeneratorPort
      ) => new LogCommunicationUseCase(activityRepo, clock, idGen, new NestLoggerAdapter()),
      inject: [ACTIVITY_REPO_PORT, CLOCK_PORT_TOKEN, ID_GENERATOR_TOKEN],
    },
    {
      provide: ProcessCommunicationWebhookUseCase,
      useFactory: (activityRepo: PrismaActivityRepoAdapter, clock: ClockPort) =>
        new ProcessCommunicationWebhookUseCase(activityRepo, clock, new NestLoggerAdapter()),
      inject: [ACTIVITY_REPO_PORT, CLOCK_PORT_TOKEN],
    },
    {
      provide: UpdateActivityUseCase,
      useFactory: (activityRepo: PrismaActivityRepoAdapter, clock: ClockPort) =>
        new UpdateActivityUseCase(activityRepo, clock, new NestLoggerAdapter()),
      inject: [ACTIVITY_REPO_PORT, CLOCK_PORT_TOKEN],
    },
    {
      provide: CompleteActivityUseCase,
      useFactory: (activityRepo: PrismaActivityRepoAdapter, clock: ClockPort) =>
        new CompleteActivityUseCase(activityRepo, clock, new NestLoggerAdapter()),
      inject: [ACTIVITY_REPO_PORT, CLOCK_PORT_TOKEN],
    },
    {
      provide: ListActivitiesUseCase,
      useFactory: (activityRepo: PrismaActivityRepoAdapter) =>
        new ListActivitiesUseCase(activityRepo, new NestLoggerAdapter()),
      inject: [ACTIVITY_REPO_PORT],
    },
    {
      provide: GetTimelineUseCase,
      useFactory: (activityRepo: PrismaActivityRepoAdapter) =>
        new GetTimelineUseCase(activityRepo, new NestLoggerAdapter()),
      inject: [ACTIVITY_REPO_PORT],
    },
    {
      provide: CrmApplication,
      useFactory: (
        createDeal: CreateDealUseCase,
        updateDeal: UpdateDealUseCase,
        moveDealStage: MoveDealStageUseCase,
        markDealWon: MarkDealWonUseCase,
        markDealLost: MarkDealLostUseCase,
        listDeals: ListDealsUseCase,
        getDealById: GetDealByIdUseCase,
        createActivity: CreateActivityUseCase,
        updateActivity: UpdateActivityUseCase,
        completeActivity: CompleteActivityUseCase,
        listActivities: ListActivitiesUseCase,
        getTimeline: GetTimelineUseCase,
        logMessage: LogMessageUseCase,
        createCommunicationDraft: CreateCommunicationDraftUseCase,
        sendCommunication: SendCommunicationUseCase,
        logCommunication: LogCommunicationUseCase,
        processCommunicationWebhook: ProcessCommunicationWebhookUseCase
      ) =>
        new CrmApplication(
          createDeal,
          updateDeal,
          moveDealStage,
          markDealWon,
          markDealLost,
          listDeals,
          getDealById,
          createActivity,
          updateActivity,
          completeActivity,
          listActivities,
          getTimeline,
          logMessage,
          createCommunicationDraft,
          sendCommunication,
          logCommunication,
          processCommunicationWebhook
        ),
      inject: [
        CreateDealUseCase,
        UpdateDealUseCase,
        MoveDealStageUseCase,
        MarkDealWonUseCase,
        MarkDealLostUseCase,
        ListDealsUseCase,
        GetDealByIdUseCase,
        CreateActivityUseCase,
        UpdateActivityUseCase,
        CompleteActivityUseCase,
        ListActivitiesUseCase,
        GetTimelineUseCase,
        LogMessageUseCase,
        CreateCommunicationDraftUseCase,
        SendCommunicationUseCase,
        LogCommunicationUseCase,
        ProcessCommunicationWebhookUseCase,
      ],
    },
  ],
  exports: [CrmApplication],
})
export class CrmModule {}
