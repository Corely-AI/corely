import { Module } from "@nestjs/common";
import { ExpensesController } from "./presentation/http/expenses.controller";
import { CreateExpenseUseCase } from "./application/use-cases/CreateExpenseUseCase";
import { PrismaExpenseRepository } from "./infrastructure/persistence/PrismaExpenseRepository";
import { OutboxPort, OUTBOX_PORT_TOKEN } from "../../shared/ports/outbox.port";
import { AuditPort, AUDIT_PORT_TOKEN } from "../../shared/ports/audit.port";
import { IdempotencyPort, IDEMPOTENCY_PORT_TOKEN } from "../../shared/ports/idempotency.port";
import { IdGeneratorPort, ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import { ClockPort, CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { PrismaOutboxAdapter } from "../../shared/infrastructure/persistence/prisma-outbox.adapter";
import { PrismaAuditAdapter } from "../../shared/infrastructure/persistence/prisma-audit.adapter";
import { PrismaIdempotencyAdapter } from "../../shared/infrastructure/persistence/prisma-idempotency.adapter";
import { SystemIdGenerator } from "../../shared/infrastructure/system-id-generator";
import { SystemClock } from "../../shared/infrastructure/system-clock";
import { CustomFieldDefinitionRepository, CustomFieldIndexRepository } from "@kerniflow/data";

@Module({
  controllers: [ExpensesController],
  providers: [
    PrismaExpenseRepository,
    CustomFieldDefinitionRepository,
    CustomFieldIndexRepository,
    PrismaOutboxAdapter,
    PrismaAuditAdapter,
    PrismaIdempotencyAdapter,
    SystemIdGenerator,
    SystemClock,
    {
      provide: CreateExpenseUseCase,
      useFactory: (
        repo: PrismaExpenseRepository,
        outbox: OutboxPort,
        audit: AuditPort,
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
        PrismaExpenseRepository,
        OUTBOX_PORT_TOKEN,
        AUDIT_PORT_TOKEN,
        IDEMPOTENCY_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        CustomFieldDefinitionRepository,
        CustomFieldIndexRepository,
      ],
    },
    { provide: OUTBOX_PORT_TOKEN, useClass: PrismaOutboxAdapter },
    { provide: AUDIT_PORT_TOKEN, useClass: PrismaAuditAdapter },
    { provide: IDEMPOTENCY_PORT_TOKEN, useClass: PrismaIdempotencyAdapter },
    { provide: ID_GENERATOR_TOKEN, useExisting: SystemIdGenerator },
    { provide: CLOCK_PORT_TOKEN, useExisting: SystemClock },
  ],
  exports: [CreateExpenseUseCase],
})
export class ExpensesModule {}
