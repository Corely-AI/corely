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

import {
  CreateWarehouseUseCase,
  UpdateWarehouseUseCase,
  GetWarehouseUseCase,
  ListWarehousesUseCase,
} from "../application/use-cases/warehouses.usecases";

export const warehouseProviders: Provider[] = [
  {
    provide: CreateWarehouseUseCase,
    useFactory: (
      repo: PrismaWarehouseRepository,
      locationRepo: PrismaLocationRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new CreateWarehouseUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        locationRepo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      WAREHOUSE_REPO,
      LOCATION_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
  {
    provide: UpdateWarehouseUseCase,
    useFactory: (
      repo: PrismaWarehouseRepository,
      locationRepo: PrismaLocationRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new UpdateWarehouseUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        locationRepo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      WAREHOUSE_REPO,
      LOCATION_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
  {
    provide: GetWarehouseUseCase,
    useFactory: (
      repo: PrismaWarehouseRepository,
      locationRepo: PrismaLocationRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new GetWarehouseUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        locationRepo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      WAREHOUSE_REPO,
      LOCATION_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
  {
    provide: ListWarehousesUseCase,
    useFactory: (
      repo: PrismaWarehouseRepository,
      locationRepo: PrismaLocationRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new ListWarehousesUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        locationRepo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      WAREHOUSE_REPO,
      LOCATION_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
];
