import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { CopilotController } from "./adapters/http/copilot.controller";
import { EnvService } from "@corely/config";

import { StreamCopilotChatUseCase } from "./application/use-cases/stream-copilot-chat.usecase";
import { PrismaAgentRunRepository } from "./infrastructure/adapters/prisma-agent-run-repository.adapter";
import { PrismaMessageRepository } from "./infrastructure/adapters/prisma-message-repository.adapter";
import { PrismaChatStoreAdapter } from "./infrastructure/adapters/prisma-chat-store.adapter";
import { PrismaToolExecutionRepository } from "./infrastructure/adapters/prisma-tool-execution-repository.adapter";
import { PrismaThreadHistoryRepository } from "./infrastructure/adapters/prisma-thread-history-repository.adapter";
import { ToolRegistry } from "./infrastructure/tools/tool-registry";
import { AiSdkModelAdapter } from "./infrastructure/model/ai-sdk.model-adapter";
import { PrismaAuditAdapter } from "./infrastructure/audit/prisma.audit.adapter";
import { PrismaCopilotIdempotencyAdapter } from "./infrastructure/idempotency/prisma-idempotency-copilot.adapter";
import { TenantGuard } from "./adapters/http/guards/tenant.guard";
import { COPILOT_TOOLS } from "./application/ports/tool-registry.port";
import { AuditPort } from "./application/ports/audit.port";
import { OUTBOX_PORT } from "@corely/kernel";
import type { OutboxPort } from "@corely/kernel";
import { ClockPort } from "@corely/kernel/ports/clock.port";
import { IdentityModule } from "../identity/identity.module";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { IdempotencyService } from "../../shared/infrastructure/idempotency/idempotency.service";
import { InvoicesModule } from "../invoices/invoices.module";
import { InvoicesApplication } from "../invoices/application/invoices.application";
import { buildInvoiceTools } from "../invoices/adapters/tools/invoice.tools";
import { buildInvoiceWorkflowTools } from "./infrastructure/tools/invoice-workflow.tools";
import { PartyModule } from "../party";
import { PartyApplication } from "../party/application/party.application";
import { buildCustomerTools } from "../party/adapters/tools/customer.tools";
import { CrmModule } from "../crm/crm.module";
import { CrmApplication } from "../crm/application/crm.application";
import { buildCrmAiTools } from "../crm/adapters/tools/crm.tools";
import { SalesModule } from "../sales";
import { SalesApplication } from "../sales/application/sales.application";
import { buildSalesTools } from "../sales/adapters/tools/sales.tools";
import { PurchasingModule } from "../purchasing";
import { PurchasingApplication } from "../purchasing/application/purchasing.application";
import { buildPurchasingTools } from "../purchasing/adapters/tools/purchasing.tools";
import { InventoryModule } from "../inventory";
import { InventoryApplication } from "../inventory/application/inventory.application";
import { buildInventoryTools } from "../inventory/adapters/tools/inventory.tools";
import { buildApprovalTools } from "../approvals/adapters/tools/approval.tools";
import { EngagementModule } from "../engagement/engagement.module";
import { EngagementApplication } from "../engagement/application/engagement.application";
import { buildEngagementTools } from "../engagement/adapters/tools/engagement.tools";
import { ClassesModule } from "../classes/classes.module";
import { GetTeacherDashboardSummaryUseCase } from "../classes/application/use-cases/get-teacher-dashboard-summary.use-case";
import { GetTeacherDashboardUnpaidInvoicesUseCase } from "../classes/application/use-cases/get-teacher-dashboard-unpaid-invoices.use-case";
import { ListClassGroupsUseCase } from "../classes/application/use-cases/list-class-groups.usecase";
import { ListSessionsUseCase } from "../classes/application/use-cases/list-sessions.usecase";
import { GetSessionUseCase } from "../classes/application/use-cases/get-session.usecase";
import { GetSessionAttendanceUseCase } from "../classes/application/use-cases/get-session-attendance.usecase";
import { ListEnrollmentsUseCase } from "../classes/application/use-cases/list-enrollments.usecase";
import { GetClassGroupUseCase } from "../classes/application/use-cases/get-class-group.usecase";
import { UpdateSessionUseCase } from "../classes/application/use-cases/update-session.usecase";
import { BulkUpsertAttendanceUseCase } from "../classes/application/use-cases/bulk-upsert-attendance.usecase";
import { buildClassesTools } from "../classes/adapters/tools/classes.tools";
import { OtelObservabilityAdapter } from "../../shared/observability/otel-observability.adapter";
import { type ObservabilityPort } from "@corely/kernel";
import { CreateRunUseCase } from "./application/use-cases/create-run.usecase";
import { GetRunUseCase } from "./application/use-cases/get-run.usecase";
import { ListMessagesUseCase } from "./application/use-cases/list-messages.usecase";
import { ListCopilotThreadsUseCase } from "./application/use-cases/list-copilot-threads.usecase";
import { GetCopilotThreadUseCase } from "./application/use-cases/get-copilot-thread.usecase";
import { ListCopilotThreadMessagesUseCase } from "./application/use-cases/list-copilot-thread-messages.usecase";
import { SearchCopilotMessagesUseCase } from "./application/use-cases/search-copilot-messages.usecase";
import { CreateCopilotThreadUseCase } from "./application/use-cases/create-copilot-thread.usecase";
import { PromptModule } from "../../shared/prompts/prompt.module";
import { PromptRegistry } from "@corely/prompts";
import { PromptUsageLogger } from "../../shared/prompts/prompt-usage.logger";
import { CHAT_STORE_PORT, type ChatStorePort } from "./application/ports/chat-store.port";
import {
  THREAD_HISTORY_REPOSITORY_PORT,
  type ThreadHistoryRepositoryPort,
} from "./application/ports/thread-history-repository.port";
import { CopilotContextBuilder } from "./application/services/copilot-context.builder";
import { CopilotTaskStateTracker } from "./application/services/copilot-task-state.service";
import type { DomainToolPort } from "./application/ports/domain-tool.port";
import { PlatformEntitlementsModule } from "../platform-entitlements/platform-entitlements.module";

@Module({
  imports: [
    DataModule,
    IdentityModule,
    InvoicesModule,
    PartyModule,
    CrmModule,
    SalesModule,
    PurchasingModule,
    InventoryModule,
    EngagementModule,
    ClassesModule,
    PlatformEntitlementsModule,
    PromptModule,
  ],
  controllers: [CopilotController],
  providers: [
    PrismaAgentRunRepository,
    PrismaMessageRepository,
    PrismaChatStoreAdapter,
    PrismaToolExecutionRepository,
    PrismaThreadHistoryRepository,
    ToolRegistry,
    PrismaAuditAdapter,
    IdempotencyService,
    PrismaCopilotIdempotencyAdapter,
    TenantGuard,
    { provide: "COPILOT_LOGGER", useClass: NestLoggerAdapter },
    {
      provide: AiSdkModelAdapter,
      useFactory: (
        toolExec: PrismaToolExecutionRepository,
        audit: PrismaAuditAdapter,
        outbox: OutboxPort,
        env: EnvService,
        logger: NestLoggerAdapter,
        observability: ObservabilityPort,
        promptRegistry: PromptRegistry,
        promptUsageLogger: PromptUsageLogger
      ) => {
        logger.debug("Creating AiSdkModelAdapter");
        return new AiSdkModelAdapter(
          toolExec,
          audit,
          outbox,
          env,
          observability,
          promptRegistry,
          promptUsageLogger
        );
      },
      inject: [
        PrismaToolExecutionRepository,
        PrismaAuditAdapter,
        OUTBOX_PORT,
        EnvService,
        "COPILOT_LOGGER",
        "OBSERVABILITY_PORT",
        PromptRegistry,
        PromptUsageLogger,
      ],
    },
    {
      provide: "COPILOT_CLOCK",
      useValue: { now: () => new Date() },
    },
    {
      provide: CreateRunUseCase,
      useFactory: (runs: PrismaAgentRunRepository) => new CreateRunUseCase(runs),
      inject: [PrismaAgentRunRepository],
    },
    {
      provide: GetRunUseCase,
      useFactory: (runs: PrismaAgentRunRepository) => new GetRunUseCase(runs),
      inject: [PrismaAgentRunRepository],
    },
    {
      provide: ListMessagesUseCase,
      useFactory: (messages: PrismaMessageRepository) => new ListMessagesUseCase(messages),
      inject: [PrismaMessageRepository],
    },
    {
      provide: CHAT_STORE_PORT,
      useClass: PrismaChatStoreAdapter,
    },
    {
      provide: THREAD_HISTORY_REPOSITORY_PORT,
      useClass: PrismaThreadHistoryRepository,
    },
    {
      provide: ListCopilotThreadsUseCase,
      useFactory: (threads: ThreadHistoryRepositoryPort) => new ListCopilotThreadsUseCase(threads),
      inject: [THREAD_HISTORY_REPOSITORY_PORT],
    },
    {
      provide: GetCopilotThreadUseCase,
      useFactory: (threads: ThreadHistoryRepositoryPort) => new GetCopilotThreadUseCase(threads),
      inject: [THREAD_HISTORY_REPOSITORY_PORT],
    },
    {
      provide: ListCopilotThreadMessagesUseCase,
      useFactory: (threads: ThreadHistoryRepositoryPort) =>
        new ListCopilotThreadMessagesUseCase(threads),
      inject: [THREAD_HISTORY_REPOSITORY_PORT],
    },
    {
      provide: SearchCopilotMessagesUseCase,
      useFactory: (threads: ThreadHistoryRepositoryPort) =>
        new SearchCopilotMessagesUseCase(threads),
      inject: [THREAD_HISTORY_REPOSITORY_PORT],
    },
    {
      provide: CreateCopilotThreadUseCase,
      useFactory: (threads: ThreadHistoryRepositoryPort, clock: ClockPort) =>
        new CreateCopilotThreadUseCase(threads, clock),
      inject: [THREAD_HISTORY_REPOSITORY_PORT, "COPILOT_CLOCK"],
    },
    CopilotContextBuilder,
    CopilotTaskStateTracker,
    {
      provide: "OBSERVABILITY_PORT",
      useFactory: (env: EnvService) =>
        new OtelObservabilityAdapter({ maskingMode: env.OBSERVABILITY_MASKING_MODE }),
      inject: [EnvService],
    },
    {
      provide: COPILOT_TOOLS,
      useFactory: (
        invoices: InvoicesApplication,
        partyCrm: PartyApplication,
        crm: CrmApplication,
        sales: SalesApplication,
        purchasing: PurchasingApplication,
        inventory: InventoryApplication,
        engagement: EngagementApplication,
        classSummary: GetTeacherDashboardSummaryUseCase,
        classUnpaidInvoices: GetTeacherDashboardUnpaidInvoicesUseCase,
        listClassGroups: ListClassGroupsUseCase,
        listSessions: ListSessionsUseCase,
        getSession: GetSessionUseCase,
        getSessionAttendance: GetSessionAttendanceUseCase,
        listEnrollments: ListEnrollmentsUseCase,
        getClassGroup: GetClassGroupUseCase,
        updateSession: UpdateSessionUseCase,
        bulkUpsertAttendance: BulkUpsertAttendanceUseCase,
        env: EnvService,
        promptRegistry: PromptRegistry,
        promptUsageLogger: PromptUsageLogger
      ) => {
        const withAppId = (appId: string, tools: DomainToolPort[]): DomainToolPort[] =>
          tools.map((tool) => ({ ...tool, appId }));

        return [
          ...withAppId("invoices", buildInvoiceWorkflowTools(invoices, partyCrm)),
          ...withAppId("invoices", buildInvoiceTools(invoices)),
          ...withAppId("parties", buildCustomerTools(partyCrm)),
          ...withAppId(
            "crm",
            buildCrmAiTools({
              party: partyCrm,
              crm,
              env,
              promptRegistry,
              promptUsageLogger,
            })
          ),
          ...withAppId("sales", buildSalesTools(sales)),
          ...withAppId(
            "purchasing",
            buildPurchasingTools(purchasing, env, promptRegistry, promptUsageLogger)
          ),
          ...withAppId(
            "inventory",
            buildInventoryTools(inventory, env, promptRegistry, promptUsageLogger)
          ),
          ...withAppId("approvals", buildApprovalTools(env, promptRegistry, promptUsageLogger)),
          ...withAppId("engagement", buildEngagementTools(engagement, partyCrm)),
          ...withAppId(
            "classes",
            buildClassesTools({
              getSummary: classSummary,
              getUnpaidInvoices: classUnpaidInvoices,
              listClassGroups,
              listSessions,
              getSession,
              getSessionAttendance,
              listEnrollments,
              getClassGroup,
              updateSession,
              bulkUpsertAttendance,
            })
          ),
        ];
      },
      inject: [
        InvoicesApplication,
        PartyApplication,
        CrmApplication,
        SalesApplication,
        PurchasingApplication,
        InventoryApplication,
        EngagementApplication,
        GetTeacherDashboardSummaryUseCase,
        GetTeacherDashboardUnpaidInvoicesUseCase,
        ListClassGroupsUseCase,
        ListSessionsUseCase,
        GetSessionUseCase,
        GetSessionAttendanceUseCase,
        ListEnrollmentsUseCase,
        GetClassGroupUseCase,
        UpdateSessionUseCase,
        BulkUpsertAttendanceUseCase,
        EnvService,
        PromptRegistry,
        PromptUsageLogger,
      ],
    },
    {
      provide: StreamCopilotChatUseCase,
      useFactory: (
        runs: PrismaAgentRunRepository,
        chatStore: ChatStorePort,
        toolExec: PrismaToolExecutionRepository,
        tools: ToolRegistry,
        model: AiSdkModelAdapter,
        audit: PrismaAuditAdapter,
        outbox: OutboxPort,
        idem: PrismaCopilotIdempotencyAdapter,
        clock: ClockPort,
        logger: NestLoggerAdapter,
        observability: ObservabilityPort,
        contextBuilder: CopilotContextBuilder,
        taskTracker: CopilotTaskStateTracker
      ) => {
        logger.debug("Creating StreamCopilotChatUseCase");
        return new StreamCopilotChatUseCase(
          runs,
          chatStore,
          toolExec,
          tools,
          model,
          audit as AuditPort,
          outbox as OutboxPort,
          idem,
          clock,
          observability,
          contextBuilder,
          taskTracker
        );
      },
      inject: [
        PrismaAgentRunRepository,
        CHAT_STORE_PORT,
        PrismaToolExecutionRepository,
        ToolRegistry,
        AiSdkModelAdapter,
        PrismaAuditAdapter,
        OUTBOX_PORT,
        PrismaCopilotIdempotencyAdapter,
        "COPILOT_CLOCK",
        "COPILOT_LOGGER",
        "OBSERVABILITY_PORT",
        CopilotContextBuilder,
        CopilotTaskStateTracker,
      ],
    },
  ],
  exports: [],
})
export class AiCopilotModule {}
