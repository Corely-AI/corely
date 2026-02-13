import { Module } from "@nestjs/common";
import { OUTBOX_PORT, AUDIT_PORT } from "@corely/kernel";
import type { OutboxPort } from "@corely/kernel";
import {
  DataModule,
  CustomFieldDefinitionRepository,
  CustomFieldIndexRepository,
  PrismaService,
} from "@corely/data";
import { ExpensesController } from "./http/expenses.controller";
import {
  IdempotencyStoragePort,
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
} from "../../shared/ports/idempotency-storage.port";
import type { AuditPort } from "../../shared/ports/audit.port";
import { IdGeneratorPort, ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import { ClockPort, CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { EXPENSE_REPOSITORY } from "./application/ports/expense-repository.port";
import { ArchiveExpenseUseCase } from "./application/use-cases/archive-expense.usecase";
import { CreateExpenseUseCase } from "./application/use-cases/create-expense.usecase";
import { ListExpensesUseCase } from "./application/use-cases/list-expenses.usecase";
import { GetExpenseUseCase } from "./application/use-cases/get-expense.usecase";
import { UpdateExpenseUseCase } from "./application/use-cases/update-expense.usecase";
import { UnarchiveExpenseUseCase } from "./application/use-cases/unarchive-expense.usecase";
import { PrismaExpenseRepository } from "./infrastructure/adapters/prisma-expense-repository.adapter";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { PlatformModule } from "../platform/platform.module";
import { WORKSPACE_REPOSITORY_PORT } from "../workspaces/application/ports/workspace-repository.port";
import { WorkspaceTemplateService } from "../platform/application/services/workspace-template.service";
import {
  CUSTOM_FIELDS_WRITE_PORT,
  DIMENSIONS_WRITE_PORT,
  type CustomFieldsWritePort,
  type DimensionsWritePort,
  PlatformCustomAttributesModule,
  ResolveEntityIdsByCustomFieldFiltersUseCase,
  ResolveEntityIdsByDimensionFiltersUseCase,
} from "../platform-custom-attributes";
import type { WorkspaceRepositoryPort } from "../workspaces/application/ports/workspace-repository.port";

@Module({
  imports: [DataModule, KernelModule, PlatformModule, PlatformCustomAttributesModule],
  controllers: [ExpensesController],
  providers: [
    // Repository
    PrismaExpenseRepository,
    { provide: EXPENSE_REPOSITORY, useExisting: PrismaExpenseRepository },

    // Use Cases
    {
      provide: CreateExpenseUseCase,
      useFactory: (
        repo: PrismaExpenseRepository,
        outbox: OutboxPort,
        audit: AuditPort,
        idempotency: IdempotencyStoragePort,
        idGen: IdGeneratorPort,
        clock: ClockPort,
        customDefs: CustomFieldDefinitionRepository,
        customIndexes: CustomFieldIndexRepository,
        dimensionsWritePort: DimensionsWritePort,
        customFieldsWritePort: CustomFieldsWritePort,
        workspaceRepo: WorkspaceRepositoryPort,
        templateService: WorkspaceTemplateService,
        prisma: PrismaService
      ) =>
        new CreateExpenseUseCase(
          repo,
          outbox,
          audit,
          idempotency,
          idGen,
          clock,
          customDefs,
          customIndexes,
          dimensionsWritePort,
          customFieldsWritePort,
          workspaceRepo,
          templateService,
          prisma
        ),

      inject: [
        EXPENSE_REPOSITORY,
        OUTBOX_PORT,
        AUDIT_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        CustomFieldDefinitionRepository,
        CustomFieldIndexRepository,
        DIMENSIONS_WRITE_PORT,
        CUSTOM_FIELDS_WRITE_PORT,
        WORKSPACE_REPOSITORY_PORT,
        WorkspaceTemplateService,
        PrismaService,
      ],
    },
    {
      provide: ArchiveExpenseUseCase,
      useFactory: (
        repo: PrismaExpenseRepository,
        clock: ClockPort,
        audit: AuditPort,
        outbox: OutboxPort,
        dims: DimensionsWritePort,
        customs: CustomFieldsWritePort
      ) => new ArchiveExpenseUseCase(repo, clock, audit, outbox, dims, customs),
      inject: [
        EXPENSE_REPOSITORY,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
        OUTBOX_PORT,
        DIMENSIONS_WRITE_PORT,
        CUSTOM_FIELDS_WRITE_PORT,
      ],
    },
    {
      provide: UnarchiveExpenseUseCase,
      useFactory: (repo: PrismaExpenseRepository, audit: AuditPort) =>
        new UnarchiveExpenseUseCase(repo, audit),
      inject: [EXPENSE_REPOSITORY, AUDIT_PORT],
    },
    {
      provide: ListExpensesUseCase,
      useFactory: (
        repo: PrismaExpenseRepository,
        resolveByDimensions: ResolveEntityIdsByDimensionFiltersUseCase,
        resolveByCustomFields: ResolveEntityIdsByCustomFieldFiltersUseCase
      ) => new ListExpensesUseCase(repo, resolveByDimensions, resolveByCustomFields),
      inject: [
        EXPENSE_REPOSITORY,
        ResolveEntityIdsByDimensionFiltersUseCase,
        ResolveEntityIdsByCustomFieldFiltersUseCase,
      ],
    },
    {
      provide: GetExpenseUseCase,
      useFactory: (repo: PrismaExpenseRepository) => new GetExpenseUseCase(repo),
      inject: [EXPENSE_REPOSITORY],
    },
    {
      provide: UpdateExpenseUseCase,
      useFactory: (
        repo: PrismaExpenseRepository,
        audit: AuditPort,
        clock: ClockPort,
        prisma: PrismaService,
        customDefs: CustomFieldDefinitionRepository,
        customIndexes: CustomFieldIndexRepository,
        dims: DimensionsWritePort,
        customs: CustomFieldsWritePort
      ) =>
        new UpdateExpenseUseCase(
          repo,
          audit,
          clock,
          prisma,
          customDefs,
          customIndexes,
          dims,
          customs
        ),
      inject: [
        EXPENSE_REPOSITORY,
        AUDIT_PORT,
        CLOCK_PORT_TOKEN,
        PrismaService,
        CustomFieldDefinitionRepository,
        CustomFieldIndexRepository,
        DIMENSIONS_WRITE_PORT,
        CUSTOM_FIELDS_WRITE_PORT,
      ],
    },
  ],
  exports: [CreateExpenseUseCase],
})
export class ExpensesModule {}
