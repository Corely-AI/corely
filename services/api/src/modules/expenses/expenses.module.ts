import { Module } from "@nestjs/common";
import { DataModule } from "@kerniflow/data";
import { OUTBOX_PORT, AUDIT_PORT } from "@kerniflow/kernel";
import { ExpensesController } from "./adapters/http/expenses.controller";
import { CreateExpenseUseCase } from "./application/use-cases/CreateExpenseUseCase";
import { ArchiveExpenseUseCase } from "./application/use-cases/ArchiveExpenseUseCase";
import { UnarchiveExpenseUseCase } from "./application/use-cases/UnarchiveExpenseUseCase";
import { PrismaExpenseRepository } from "./infrastructure/persistence/PrismaExpenseRepository";
import { EXPENSE_REPOSITORY } from "./application/ports/ExpenseRepositoryPort";
import { IdempotencyPort, IDEMPOTENCY_PORT_TOKEN } from "../../shared/ports/idempotency.port";
import { IdGeneratorPort, ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import { ClockPort, CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { PrismaIdempotencyAdapter } from "../../shared/infrastructure/persistence/prisma-idempotency.adapter";
import { SystemIdGenerator } from "../../shared/infrastructure/system-id-generator";
import { SystemClock } from "../../shared/infrastructure/system-clock";
import { CustomFieldDefinitionRepository, CustomFieldIndexRepository } from "@kerniflow/data";

@Module({
  imports: [DataModule],
  controllers: [ExpensesController],
  providers: [
    // Repository
    PrismaExpenseRepository,
    { provide: EXPENSE_REPOSITORY, useExisting: PrismaExpenseRepository },

    // Shared infrastructure (eventually move to DataModule)
    PrismaIdempotencyAdapter,
    SystemIdGenerator,
    SystemClock,

    // Use Cases
    {
      provide: CreateExpenseUseCase,
      useFactory: (
        repo: PrismaExpenseRepository,
        outbox,
        audit,
        idempotency: IdempotencyPort,
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
        IDEMPOTENCY_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        CustomFieldDefinitionRepository,
        CustomFieldIndexRepository,
      ],
    },
    {
      provide: ArchiveExpenseUseCase,
      useFactory: (repo: PrismaExpenseRepository, clock: ClockPort) =>
        new ArchiveExpenseUseCase(repo, clock),
      inject: [EXPENSE_REPOSITORY, CLOCK_PORT_TOKEN],
    },
    {
      provide: UnarchiveExpenseUseCase,
      useFactory: (repo: PrismaExpenseRepository) => new UnarchiveExpenseUseCase(repo),
      inject: [EXPENSE_REPOSITORY],
    },

    // Token bindings for shared ports
    { provide: IDEMPOTENCY_PORT_TOKEN, useClass: PrismaIdempotencyAdapter },
    { provide: ID_GENERATOR_TOKEN, useExisting: SystemIdGenerator },
    { provide: CLOCK_PORT_TOKEN, useExisting: SystemClock },
  ],
  exports: [CreateExpenseUseCase],
})
export class ExpensesModule {}
