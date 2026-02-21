import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { OUTBOX_PORT, AUDIT_PORT } from "@corely/kernel";
import { KernelModule } from "@/shared/kernel/kernel.module";
import { ID_GENERATOR_TOKEN, type IdGeneratorPort } from "@/shared/ports/id-generator.port";
import { CLOCK_PORT_TOKEN, type ClockPort } from "@/shared/ports/clock.port";
import {
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
  type IdempotencyStoragePort,
} from "@/shared/ports/idempotency-storage.port";
import { ClassesController } from "./http/classes.controller";
import { ClassesAcademyController } from "./http/classes-academy.controller";
import { ClassesInternalController } from "./http/classes-internal.controller";
import { TeacherDashboardController } from "./http/controllers/teacher-dashboard.controller";
import { PrismaClassesRepository } from "./infrastructure/prisma/classes.repository";
import { PrismaTeacherDashboardQuery } from "./infrastructure/prisma/prisma-teacher-dashboard.query";
import { InvoicesWriteAdapter } from "./infrastructure/adapters/invoices-write.adapter";
import { ExtKvClassesSettingsRepository } from "./infrastructure/adapters/ext-kv-classes-settings.repository";
import { InvoicesModule } from "../invoices/invoices.module";
import { IdentityModule } from "../identity";
import { PlatformModule } from "../platform";
import {
  CLASSES_REPOSITORY_PORT,
  type ClassesRepositoryPort,
} from "./application/ports/classes-repository.port";
import {
  CLASSES_SETTINGS_REPOSITORY_PORT,
  type ClassesSettingsRepositoryPort,
} from "./application/ports/classes-settings-repository.port";
import {
  TEACHER_DASHBOARD_QUERY,
  type TeacherDashboardQueryPort,
} from "./application/ports/teacher-dashboard-query.port";
import {
  INVOICES_WRITE_PORT,
  type InvoicesWritePort,
} from "./application/ports/invoices-write.port";
import { CreateClassGroupUseCase } from "./application/use-cases/create-class-group.usecase";
import { UpdateClassGroupUseCase } from "./application/use-cases/update-class-group.usecase";
import { ListClassGroupsUseCase } from "./application/use-cases/list-class-groups.usecase";
import { GetClassGroupUseCase } from "./application/use-cases/get-class-group.usecase";
import { CreateSessionUseCase } from "./application/use-cases/create-session.usecase";
import { CreateRecurringSessionsUseCase } from "./application/use-cases/create-recurring-sessions.usecase";
import { GenerateScheduledSessionsUseCase } from "./application/use-cases/generate-scheduled-sessions.usecase";
import { UpdateSessionUseCase } from "./application/use-cases/update-session.usecase";
import { ListSessionsUseCase } from "./application/use-cases/list-sessions.usecase";
import { GetSessionUseCase } from "./application/use-cases/get-session.usecase";
import { UpsertEnrollmentUseCase } from "./application/use-cases/upsert-enrollment.usecase";
import { UpdateEnrollmentUseCase } from "./application/use-cases/update-enrollment.usecase";
import { ListEnrollmentsUseCase } from "./application/use-cases/list-enrollments.usecase";
import { BulkUpsertAttendanceUseCase } from "./application/use-cases/bulk-upsert-attendance.usecase";
import { GetSessionAttendanceUseCase } from "./application/use-cases/get-session-attendance.usecase";
import { GetMonthlyBillingPreviewUseCase } from "./application/use-cases/get-monthly-billing-preview.usecase";
import { CreateMonthlyBillingRunUseCase } from "./application/use-cases/create-monthly-billing-run.usecase";
import { LockMonthUseCase } from "./application/use-cases/lock-month.usecase";
import { GetClassesBillingSettingsUseCase } from "./application/use-cases/get-classes-billing-settings.usecase";
import { UpdateClassesBillingSettingsUseCase } from "./application/use-cases/update-classes-billing-settings.usecase";
import { GetTeacherDashboardSummaryUseCase } from "./application/use-cases/get-teacher-dashboard-summary.use-case";
import { GetTeacherDashboardUnpaidInvoicesUseCase } from "./application/use-cases/get-teacher-dashboard-unpaid-invoices.use-case";
import { GetBillingRunSendProgressUseCase } from "./application/use-cases/get-billing-run-send-progress.usecase";
import { CreateProgramUseCase } from "./application/use-cases/create-program.usecase";
import { UpdateProgramUseCase } from "./application/use-cases/update-program.usecase";
import { ListProgramsUseCase } from "./application/use-cases/list-programs.usecase";
import { GetProgramUseCase } from "./application/use-cases/get-program.usecase";
import { DeleteProgramUseCase } from "./application/use-cases/delete-program.usecase";
import { ReplaceProgramSessionTemplatesUseCase } from "./application/use-cases/replace-program-session-templates.usecase";
import { ReplaceProgramMilestoneTemplatesUseCase } from "./application/use-cases/replace-program-milestone-templates.usecase";
import { CreateCohortFromProgramUseCase } from "./application/use-cases/create-cohort-from-program.usecase";
import { UpdateCohortLifecycleUseCase } from "./application/use-cases/update-cohort-lifecycle.usecase";
import { ListCohortTeamUseCase } from "./application/use-cases/list-cohort-team.usecase";
import { UpsertCohortTeamUseCase } from "./application/use-cases/upsert-cohort-team.usecase";
import { CreateApplicationUseCase } from "./application/use-cases/create-application.usecase";
import { ApproveApplicationUseCase } from "./application/use-cases/approve-application.usecase";
import { GetEnrollmentBillingPlanUseCase } from "./application/use-cases/get-enrollment-billing-plan.usecase";
import { UpsertEnrollmentBillingPlanUseCase } from "./application/use-cases/upsert-enrollment-billing-plan.usecase";
import { GenerateInvoicesFromEnrollmentBillingPlanUseCase } from "./application/use-cases/generate-invoices-from-enrollment-billing-plan.usecase";
import { ListMilestonesUseCase } from "./application/use-cases/list-milestones.usecase";
import { CreateMilestoneUseCase } from "./application/use-cases/create-milestone.usecase";
import { UpdateMilestoneUseCase } from "./application/use-cases/update-milestone.usecase";
import { DeleteMilestoneUseCase } from "./application/use-cases/delete-milestone.usecase";
import { UpsertMilestoneCompletionUseCase } from "./application/use-cases/upsert-milestone-completion.usecase";
import { GetOutcomesSummaryUseCase } from "./application/use-cases/get-outcomes-summary.usecase";
import { ListResourcesUseCase } from "./application/use-cases/list-resources.usecase";
import { CreateResourceUseCase } from "./application/use-cases/create-resource.usecase";
import { UpdateResourceUseCase } from "./application/use-cases/update-resource.usecase";
import { DeleteResourceUseCase } from "./application/use-cases/delete-resource.usecase";
import { ReorderResourcesUseCase } from "./application/use-cases/reorder-resources.usecase";

@Module({
  imports: [DataModule, KernelModule, IdentityModule, PlatformModule, InvoicesModule],
  controllers: [
    ClassesController,
    ClassesAcademyController,
    ClassesInternalController,
    TeacherDashboardController,
  ],
  providers: [
    PrismaClassesRepository,
    { provide: CLASSES_REPOSITORY_PORT, useExisting: PrismaClassesRepository },
    ExtKvClassesSettingsRepository,
    { provide: CLASSES_SETTINGS_REPOSITORY_PORT, useExisting: ExtKvClassesSettingsRepository },
    PrismaTeacherDashboardQuery,
    { provide: TEACHER_DASHBOARD_QUERY, useExisting: PrismaTeacherDashboardQuery },
    InvoicesWriteAdapter,
    { provide: INVOICES_WRITE_PORT, useExisting: InvoicesWriteAdapter },

    {
      provide: CreateClassGroupUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        audit,
        idempotency: IdempotencyStoragePort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) => new CreateClassGroupUseCase(repo, audit, idempotency, idGenerator, clock),
      inject: [
        CLASSES_REPOSITORY_PORT,
        AUDIT_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: UpdateClassGroupUseCase,
      useFactory: (repo: ClassesRepositoryPort, audit, clock: ClockPort) =>
        new UpdateClassGroupUseCase(repo, audit, clock),
      inject: [CLASSES_REPOSITORY_PORT, AUDIT_PORT, CLOCK_PORT_TOKEN],
    },
    {
      provide: ListClassGroupsUseCase,
      useFactory: (repo: ClassesRepositoryPort) => new ListClassGroupsUseCase(repo),
      inject: [CLASSES_REPOSITORY_PORT],
    },
    {
      provide: GetClassGroupUseCase,
      useFactory: (repo: ClassesRepositoryPort) => new GetClassGroupUseCase(repo),
      inject: [CLASSES_REPOSITORY_PORT],
    },
    {
      provide: CreateSessionUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        settingsRepo: ClassesSettingsRepositoryPort,
        audit,
        idempotency: IdempotencyStoragePort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) => new CreateSessionUseCase(repo, settingsRepo, audit, idempotency, idGenerator, clock),
      inject: [
        CLASSES_REPOSITORY_PORT,
        CLASSES_SETTINGS_REPOSITORY_PORT,
        AUDIT_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: CreateRecurringSessionsUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        settingsRepo: ClassesSettingsRepositoryPort,
        audit,
        idempotency: IdempotencyStoragePort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) =>
        new CreateRecurringSessionsUseCase(
          repo,
          settingsRepo,
          audit,
          idempotency,
          idGenerator,
          clock
        ),
      inject: [
        CLASSES_REPOSITORY_PORT,
        CLASSES_SETTINGS_REPOSITORY_PORT,
        AUDIT_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: GenerateScheduledSessionsUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        settingsRepo: ClassesSettingsRepositoryPort,
        audit,
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) => new GenerateScheduledSessionsUseCase(repo, settingsRepo, audit, idGenerator, clock),
      inject: [
        CLASSES_REPOSITORY_PORT,
        CLASSES_SETTINGS_REPOSITORY_PORT,
        AUDIT_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: UpdateSessionUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        settingsRepo: ClassesSettingsRepositoryPort,
        audit,
        clock: ClockPort,
        idGenerator: IdGeneratorPort
      ) => new UpdateSessionUseCase(repo, settingsRepo, audit, clock, idGenerator),
      inject: [
        CLASSES_REPOSITORY_PORT,
        CLASSES_SETTINGS_REPOSITORY_PORT,
        AUDIT_PORT,
        CLOCK_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
      ],
    },
    {
      provide: ListSessionsUseCase,
      useFactory: (repo: ClassesRepositoryPort) => new ListSessionsUseCase(repo),
      inject: [CLASSES_REPOSITORY_PORT],
    },
    {
      provide: GetSessionUseCase,
      useFactory: (repo: ClassesRepositoryPort) => new GetSessionUseCase(repo),
      inject: [CLASSES_REPOSITORY_PORT],
    },
    {
      provide: UpsertEnrollmentUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        audit,
        idempotency: IdempotencyStoragePort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) => new UpsertEnrollmentUseCase(repo, audit, idempotency, idGenerator, clock),
      inject: [
        CLASSES_REPOSITORY_PORT,
        AUDIT_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: UpdateEnrollmentUseCase,
      useFactory: (repo: ClassesRepositoryPort, audit, clock: ClockPort) =>
        new UpdateEnrollmentUseCase(repo, audit, clock),
      inject: [CLASSES_REPOSITORY_PORT, AUDIT_PORT, CLOCK_PORT_TOKEN],
    },
    {
      provide: ListEnrollmentsUseCase,
      useFactory: (repo: ClassesRepositoryPort) => new ListEnrollmentsUseCase(repo),
      inject: [CLASSES_REPOSITORY_PORT],
    },
    {
      provide: BulkUpsertAttendanceUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        settingsRepo: ClassesSettingsRepositoryPort,
        audit,
        idempotency: IdempotencyStoragePort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) =>
        new BulkUpsertAttendanceUseCase(repo, settingsRepo, audit, idempotency, idGenerator, clock),
      inject: [
        CLASSES_REPOSITORY_PORT,
        CLASSES_SETTINGS_REPOSITORY_PORT,
        AUDIT_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: GetSessionAttendanceUseCase,
      useFactory: (repo: ClassesRepositoryPort, settingsRepo: ClassesSettingsRepositoryPort) =>
        new GetSessionAttendanceUseCase(repo, settingsRepo),
      inject: [CLASSES_REPOSITORY_PORT, CLASSES_SETTINGS_REPOSITORY_PORT],
    },
    {
      provide: GetMonthlyBillingPreviewUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        settingsRepo: ClassesSettingsRepositoryPort,
        clock: ClockPort
      ) => new GetMonthlyBillingPreviewUseCase(repo, settingsRepo, clock),
      inject: [CLASSES_REPOSITORY_PORT, CLASSES_SETTINGS_REPOSITORY_PORT, CLOCK_PORT_TOKEN],
    },
    {
      provide: GetBillingRunSendProgressUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        getMonthlyBillingPreviewUseCase: GetMonthlyBillingPreviewUseCase
      ) => new GetBillingRunSendProgressUseCase(repo, getMonthlyBillingPreviewUseCase),
      inject: [CLASSES_REPOSITORY_PORT, GetMonthlyBillingPreviewUseCase],
    },
    {
      provide: CreateMonthlyBillingRunUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        settingsRepo: ClassesSettingsRepositoryPort,
        invoices: InvoicesWritePort,
        audit,
        outbox,
        idempotency: IdempotencyStoragePort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) =>
        new CreateMonthlyBillingRunUseCase(
          repo,
          settingsRepo,
          invoices,
          audit,
          outbox,
          idempotency,
          idGenerator,
          clock
        ),
      inject: [
        CLASSES_REPOSITORY_PORT,
        CLASSES_SETTINGS_REPOSITORY_PORT,
        INVOICES_WRITE_PORT,
        AUDIT_PORT,
        OUTBOX_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: GetClassesBillingSettingsUseCase,
      useFactory: (settingsRepo: ClassesSettingsRepositoryPort) =>
        new GetClassesBillingSettingsUseCase(settingsRepo),
      inject: [CLASSES_SETTINGS_REPOSITORY_PORT],
    },
    {
      provide: UpdateClassesBillingSettingsUseCase,
      useFactory: (settingsRepo: ClassesSettingsRepositoryPort) =>
        new UpdateClassesBillingSettingsUseCase(settingsRepo),
      inject: [CLASSES_SETTINGS_REPOSITORY_PORT],
    },
    {
      provide: GetTeacherDashboardSummaryUseCase,
      useFactory: (query: TeacherDashboardQueryPort, settingsRepo: ClassesSettingsRepositoryPort) =>
        new GetTeacherDashboardSummaryUseCase(query, settingsRepo),
      inject: [TEACHER_DASHBOARD_QUERY, CLASSES_SETTINGS_REPOSITORY_PORT],
    },
    {
      provide: GetTeacherDashboardUnpaidInvoicesUseCase,
      useFactory: (query: TeacherDashboardQueryPort) =>
        new GetTeacherDashboardUnpaidInvoicesUseCase(query),
      inject: [TEACHER_DASHBOARD_QUERY],
    },
    {
      provide: LockMonthUseCase,
      useFactory: (repo: ClassesRepositoryPort, audit, clock: ClockPort) =>
        new LockMonthUseCase(repo, audit, clock),
      inject: [CLASSES_REPOSITORY_PORT, AUDIT_PORT, CLOCK_PORT_TOKEN],
    },

    {
      provide: CreateProgramUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        audit,
        idempotency: IdempotencyStoragePort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) => new CreateProgramUseCase(repo, audit, idempotency, idGenerator, clock),
      inject: [
        CLASSES_REPOSITORY_PORT,
        AUDIT_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: UpdateProgramUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        audit,
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) => new UpdateProgramUseCase(repo, audit, idGenerator, clock),
      inject: [CLASSES_REPOSITORY_PORT, AUDIT_PORT, ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN],
    },
    {
      provide: ListProgramsUseCase,
      useFactory: (repo: ClassesRepositoryPort) => new ListProgramsUseCase(repo),
      inject: [CLASSES_REPOSITORY_PORT],
    },
    {
      provide: GetProgramUseCase,
      useFactory: (repo: ClassesRepositoryPort) => new GetProgramUseCase(repo),
      inject: [CLASSES_REPOSITORY_PORT],
    },
    {
      provide: DeleteProgramUseCase,
      useFactory: (repo: ClassesRepositoryPort, audit) => new DeleteProgramUseCase(repo, audit),
      inject: [CLASSES_REPOSITORY_PORT, AUDIT_PORT],
    },
    {
      provide: ReplaceProgramSessionTemplatesUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        audit,
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) => new ReplaceProgramSessionTemplatesUseCase(repo, audit, idGenerator, clock),
      inject: [CLASSES_REPOSITORY_PORT, AUDIT_PORT, ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN],
    },
    {
      provide: ReplaceProgramMilestoneTemplatesUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        audit,
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) => new ReplaceProgramMilestoneTemplatesUseCase(repo, audit, idGenerator, clock),
      inject: [CLASSES_REPOSITORY_PORT, AUDIT_PORT, ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN],
    },
    {
      provide: CreateCohortFromProgramUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        audit,
        idempotency: IdempotencyStoragePort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) => new CreateCohortFromProgramUseCase(repo, audit, idempotency, idGenerator, clock),
      inject: [
        CLASSES_REPOSITORY_PORT,
        AUDIT_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: UpdateCohortLifecycleUseCase,
      useFactory: (repo: ClassesRepositoryPort, audit, outbox, clock: ClockPort) =>
        new UpdateCohortLifecycleUseCase(repo, audit, outbox, clock),
      inject: [CLASSES_REPOSITORY_PORT, AUDIT_PORT, OUTBOX_PORT, CLOCK_PORT_TOKEN],
    },
    {
      provide: ListCohortTeamUseCase,
      useFactory: (repo: ClassesRepositoryPort) => new ListCohortTeamUseCase(repo),
      inject: [CLASSES_REPOSITORY_PORT],
    },
    {
      provide: UpsertCohortTeamUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        audit,
        outbox,
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) => new UpsertCohortTeamUseCase(repo, audit, outbox, idGenerator, clock),
      inject: [
        CLASSES_REPOSITORY_PORT,
        AUDIT_PORT,
        OUTBOX_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: CreateApplicationUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        audit,
        outbox,
        idempotency: IdempotencyStoragePort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) => new CreateApplicationUseCase(repo, audit, outbox, idempotency, idGenerator, clock),
      inject: [
        CLASSES_REPOSITORY_PORT,
        AUDIT_PORT,
        OUTBOX_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: ApproveApplicationUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        audit,
        outbox,
        idempotency: IdempotencyStoragePort,
        clock: ClockPort
      ) => new ApproveApplicationUseCase(repo, audit, outbox, idempotency, clock),
      inject: [
        CLASSES_REPOSITORY_PORT,
        AUDIT_PORT,
        OUTBOX_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: GetEnrollmentBillingPlanUseCase,
      useFactory: (repo: ClassesRepositoryPort) => new GetEnrollmentBillingPlanUseCase(repo),
      inject: [CLASSES_REPOSITORY_PORT],
    },
    {
      provide: UpsertEnrollmentBillingPlanUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        audit,
        outbox,
        idempotency: IdempotencyStoragePort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) =>
        new UpsertEnrollmentBillingPlanUseCase(
          repo,
          audit,
          outbox,
          idempotency,
          idGenerator,
          clock
        ),
      inject: [
        CLASSES_REPOSITORY_PORT,
        AUDIT_PORT,
        OUTBOX_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: GenerateInvoicesFromEnrollmentBillingPlanUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        invoices: InvoicesWritePort,
        audit,
        outbox,
        idempotency: IdempotencyStoragePort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) =>
        new GenerateInvoicesFromEnrollmentBillingPlanUseCase(
          repo,
          invoices,
          audit,
          outbox,
          idempotency,
          idGenerator,
          clock
        ),
      inject: [
        CLASSES_REPOSITORY_PORT,
        INVOICES_WRITE_PORT,
        AUDIT_PORT,
        OUTBOX_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: ListMilestonesUseCase,
      useFactory: (repo: ClassesRepositoryPort) => new ListMilestonesUseCase(repo),
      inject: [CLASSES_REPOSITORY_PORT],
    },
    {
      provide: CreateMilestoneUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        audit,
        outbox,
        idempotency: IdempotencyStoragePort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) => new CreateMilestoneUseCase(repo, audit, outbox, idempotency, idGenerator, clock),
      inject: [
        CLASSES_REPOSITORY_PORT,
        AUDIT_PORT,
        OUTBOX_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: UpdateMilestoneUseCase,
      useFactory: (repo: ClassesRepositoryPort, audit, outbox, clock: ClockPort) =>
        new UpdateMilestoneUseCase(repo, audit, outbox, clock),
      inject: [CLASSES_REPOSITORY_PORT, AUDIT_PORT, OUTBOX_PORT, CLOCK_PORT_TOKEN],
    },
    {
      provide: DeleteMilestoneUseCase,
      useFactory: (repo: ClassesRepositoryPort, audit, outbox) =>
        new DeleteMilestoneUseCase(repo, audit, outbox),
      inject: [CLASSES_REPOSITORY_PORT, AUDIT_PORT, OUTBOX_PORT],
    },
    {
      provide: UpsertMilestoneCompletionUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        audit,
        outbox,
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) => new UpsertMilestoneCompletionUseCase(repo, audit, outbox, idGenerator, clock),
      inject: [
        CLASSES_REPOSITORY_PORT,
        AUDIT_PORT,
        OUTBOX_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: GetOutcomesSummaryUseCase,
      useFactory: (repo: ClassesRepositoryPort) => new GetOutcomesSummaryUseCase(repo),
      inject: [CLASSES_REPOSITORY_PORT],
    },
    {
      provide: ListResourcesUseCase,
      useFactory: (repo: ClassesRepositoryPort) => new ListResourcesUseCase(repo),
      inject: [CLASSES_REPOSITORY_PORT],
    },
    {
      provide: CreateResourceUseCase,
      useFactory: (
        repo: ClassesRepositoryPort,
        audit,
        outbox,
        idempotency: IdempotencyStoragePort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) => new CreateResourceUseCase(repo, audit, outbox, idempotency, idGenerator, clock),
      inject: [
        CLASSES_REPOSITORY_PORT,
        AUDIT_PORT,
        OUTBOX_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: UpdateResourceUseCase,
      useFactory: (repo: ClassesRepositoryPort, audit, outbox, clock: ClockPort) =>
        new UpdateResourceUseCase(repo, audit, outbox, clock),
      inject: [CLASSES_REPOSITORY_PORT, AUDIT_PORT, OUTBOX_PORT, CLOCK_PORT_TOKEN],
    },
    {
      provide: DeleteResourceUseCase,
      useFactory: (repo: ClassesRepositoryPort, audit, outbox) =>
        new DeleteResourceUseCase(repo, audit, outbox),
      inject: [CLASSES_REPOSITORY_PORT, AUDIT_PORT, OUTBOX_PORT],
    },
    {
      provide: ReorderResourcesUseCase,
      useFactory: (repo: ClassesRepositoryPort, audit) => new ReorderResourcesUseCase(repo, audit),
      inject: [CLASSES_REPOSITORY_PORT, AUDIT_PORT],
    },
  ],
  exports: [
    CreateMonthlyBillingRunUseCase,
    CLASSES_REPOSITORY_PORT,
    PrismaClassesRepository,
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
    ListProgramsUseCase,
    GetProgramUseCase,
    GetEnrollmentBillingPlanUseCase,
  ],
})
export class ClassesModule {}
