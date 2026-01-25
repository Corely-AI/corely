import { Module } from "@nestjs/common";
import { OUTBOX_PORT, AUDIT_PORT } from "@corely/kernel";
import {
  DataModule,
  CustomFieldDefinitionRepository,
  CustomFieldIndexRepository,
} from "@corely/data";
import { ExpensesController } from "./http/expenses.controller";
import {
  IdempotencyStoragePort,
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
} from "../../shared/ports/idempotency-storage.port";
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

@Module({
  imports: [DataModule, KernelModule],
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
        outbox,
        audit,
        idempotency: IdempotencyStoragePort,
        idGen: IdGeneratorPort,
        clock: ClockPort,
        customDefs: CustomFieldDefinitionRepository,
        customIndexes: CustomFieldIndexRepository
      ) =>
        new CreateExpenseUseCase(
          repo,
          outbox,
          audit,
          idempotency,
          idGen,
          clock,
          customDefs,
          customIndexes
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
      ],
    },
    {
      provide: ArchiveExpenseUseCase,
      useFactory: (repo: PrismaExpenseRepository, clock: ClockPort, audit) =>
        new ArchiveExpenseUseCase(repo, clock, audit),
      inject: [EXPENSE_REPOSITORY, CLOCK_PORT_TOKEN, AUDIT_PORT],
    },
    {
      provide: UnarchiveExpenseUseCase,
      useFactory: (repo: PrismaExpenseRepository, audit) =>
        new UnarchiveExpenseUseCase(repo, audit),
      inject: [EXPENSE_REPOSITORY, AUDIT_PORT],
    },
    {
      provide: ListExpensesUseCase,
      useFactory: (repo: PrismaExpenseRepository) => new ListExpensesUseCase(repo),
      inject: [EXPENSE_REPOSITORY],
    },
    {
      provide: GetExpenseUseCase,
      useFactory: (repo: PrismaExpenseRepository) => new GetExpenseUseCase(repo),
      inject: [EXPENSE_REPOSITORY],
    },
    {
      provide: UpdateExpenseUseCase,
      useFactory: (repo: PrismaExpenseRepository, audit, clock: ClockPort) =>
        new UpdateExpenseUseCase(repo, audit, clock),
      inject: [EXPENSE_REPOSITORY, AUDIT_PORT, CLOCK_PORT_TOKEN],
    },
  ],
  exports: [CreateExpenseUseCase],
})
export class ExpensesModule {}
