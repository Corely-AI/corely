import { type Provider } from "@nestjs/common";
import { AUDIT_PORT, type AuditPort, type ClockPort, type IdGeneratorPort } from "@corely/kernel";
import { NestLoggerAdapter } from "../../../shared/adapters/logger/nest-logger.adapter";
import {
  type IdempotencyStoragePort,
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
} from "../../../shared/ports/idempotency-storage.port";
import { ID_GENERATOR_TOKEN } from "../../../shared/ports/id-generator.port";
import { CLOCK_PORT_TOKEN } from "../../../shared/ports/clock.port";

import { type PrismaInventoryLotRepository } from "../infrastructure/adapters/prisma-inventory-lot-repository.adapter";
import { INVENTORY_LOT_REPO } from "../application/ports/inventory-lot-repository.port";

import { CreateLotUseCase } from "../application/use-cases/create-lot.usecase";
import { ListLotsUseCase } from "../application/use-cases/list-lots.usecase";
import { GetLotUseCase } from "../application/use-cases/get-lot.usecase";
import { GetExpirySummaryUseCase } from "../application/use-cases/get-expiry-summary.usecase";

export const lotProviders: Provider[] = [
  {
    provide: CreateLotUseCase,
    useFactory: (
      repo: PrismaInventoryLotRepository,
      idempotency: IdempotencyStoragePort,
      idGen: IdGeneratorPort,
      clock: ClockPort,
      audit: AuditPort
    ) =>
      new CreateLotUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      INVENTORY_LOT_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
  {
    provide: ListLotsUseCase,
    useFactory: (repo: PrismaInventoryLotRepository) =>
      new ListLotsUseCase({
        logger: new NestLoggerAdapter(),
        repo,
      }),
    inject: [INVENTORY_LOT_REPO],
  },
  {
    provide: GetLotUseCase,
    useFactory: (repo: PrismaInventoryLotRepository) =>
      new GetLotUseCase({
        logger: new NestLoggerAdapter(),
        repo,
      }),
    inject: [INVENTORY_LOT_REPO],
  },
  {
    provide: GetExpirySummaryUseCase,
    useFactory: (repo: PrismaInventoryLotRepository) =>
      new GetExpirySummaryUseCase({
        logger: new NestLoggerAdapter(),
        repo,
      }),
    inject: [INVENTORY_LOT_REPO],
  },
];
