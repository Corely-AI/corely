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

@Module({
  imports: [DataModule, KernelModule, IdentityModule, PlatformModule, InvoicesModule],
  controllers: [ClassesController, ClassesInternalController, TeacherDashboardController],

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
  ],
})
export class ClassesModule {}
