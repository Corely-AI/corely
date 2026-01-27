import { type Provider } from "@nestjs/common";
import { AUDIT_PORT, type AuditPort } from "@corely/kernel";
import { NestLoggerAdapter } from "../../../shared/adapters/logger/nest-logger.adapter";
import {
  type IdempotencyStoragePort,
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
} from "../../../shared/ports/idempotency-storage.port";
import { ID_GENERATOR_TOKEN } from "../../../shared/ports/id-generator.port";
import { CLOCK_PORT_TOKEN } from "../../../shared/ports/clock.port";

import { type PrismaWarehouseRepository } from "../infrastructure/adapters/prisma-warehouse-repository.adapter";
import { type PrismaLocationRepository } from "../infrastructure/adapters/prisma-location-repository.adapter";

import { WAREHOUSE_REPO } from "../application/ports/warehouse-repository.port";
import { LOCATION_REPO } from "../application/ports/location-repository.port";

import { CreateLocationUseCase } from "../application/use-cases/create-location.usecase";
import { UpdateLocationUseCase } from "../application/use-cases/update-location.usecase";
import { ListLocationsUseCase } from "../application/use-cases/list-locations.usecase";

export const locationProviders: Provider[] = [
  {
    provide: CreateLocationUseCase,
    useFactory: (
      repo: PrismaLocationRepository,
      warehouseRepo: PrismaWarehouseRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new CreateLocationUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        warehouseRepo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      LOCATION_REPO,
      WAREHOUSE_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
  {
    provide: UpdateLocationUseCase,
    useFactory: (
      repo: PrismaLocationRepository,
      warehouseRepo: PrismaWarehouseRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new UpdateLocationUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        warehouseRepo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      LOCATION_REPO,
      WAREHOUSE_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
  {
    provide: ListLocationsUseCase,
    useFactory: (
      repo: PrismaLocationRepository,
      warehouseRepo: PrismaWarehouseRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new ListLocationsUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        warehouseRepo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      LOCATION_REPO,
      WAREHOUSE_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
];
