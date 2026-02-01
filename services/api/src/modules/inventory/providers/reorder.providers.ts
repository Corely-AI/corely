import { type Provider } from "@nestjs/common";
import { AUDIT_PORT, type AuditPort } from "@corely/kernel";
import { NestLoggerAdapter } from "../../../shared/adapters/logger/nest-logger.adapter";
import {
  type IdempotencyStoragePort,
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
} from "../../../shared/ports/idempotency-storage.port";
import { ID_GENERATOR_TOKEN } from "../../../shared/ports/id-generator.port";
import { CLOCK_PORT_TOKEN } from "../../../shared/ports/clock.port";

import { type PrismaReorderPolicyRepository } from "../infrastructure/adapters/prisma-reorder-policy-repository.adapter";
import { type PrismaStockMoveRepository } from "../infrastructure/adapters/prisma-stock-move-repository.adapter";
import { type PrismaProductRepository } from "../infrastructure/adapters/prisma-product-repository.adapter";
import { type PrismaWarehouseRepository } from "../infrastructure/adapters/prisma-warehouse-repository.adapter";
import { type PrismaLocationRepository } from "../infrastructure/adapters/prisma-location-repository.adapter";
import { type PrismaStockReservationRepository } from "../infrastructure/adapters/prisma-stock-reservation-repository.adapter";

import { REORDER_POLICY_REPO } from "../application/ports/reorder-policy-repository.port";
import { STOCK_MOVE_REPO } from "../application/ports/stock-move-repository.port";
import { PRODUCT_REPO } from "../application/ports/product-repository.port";
import { WAREHOUSE_REPO } from "../application/ports/warehouse-repository.port";
import { LOCATION_REPO } from "../application/ports/location-repository.port";
import { STOCK_RESERVATION_REPO } from "../application/ports/stock-reservation-repository.port";

import { ListReorderPoliciesUseCase } from "../application/use-cases/list-reorder-policies.usecase";
import { CreateReorderPolicyUseCase } from "../application/use-cases/create-reorder-policy.usecase";
import { UpdateReorderPolicyUseCase } from "../application/use-cases/update-reorder-policy.usecase";
import { GetReorderSuggestionsUseCase } from "../application/use-cases/get-reorder-suggestions.usecase";
import { GetLowStockUseCase } from "../application/use-cases/get-low-stock.usecase";

export const reorderProviders: Provider[] = [
  {
    provide: ListReorderPoliciesUseCase,
    useFactory: (
      repo: PrismaReorderPolicyRepository,
      productRepo: PrismaProductRepository,
      warehouseRepo: PrismaWarehouseRepository,
      locationRepo: PrismaLocationRepository,
      moveRepo: PrismaStockMoveRepository,
      reservationRepo: PrismaStockReservationRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new ListReorderPoliciesUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        productRepo,
        warehouseRepo,
        locationRepo,
        moveRepo,
        reservationRepo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      REORDER_POLICY_REPO,
      PRODUCT_REPO,
      WAREHOUSE_REPO,
      LOCATION_REPO,
      STOCK_MOVE_REPO,
      STOCK_RESERVATION_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
  {
    provide: CreateReorderPolicyUseCase,
    useFactory: (
      repo: PrismaReorderPolicyRepository,
      productRepo: PrismaProductRepository,
      warehouseRepo: PrismaWarehouseRepository,
      locationRepo: PrismaLocationRepository,
      moveRepo: PrismaStockMoveRepository,
      reservationRepo: PrismaStockReservationRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new CreateReorderPolicyUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        productRepo,
        warehouseRepo,
        locationRepo,
        moveRepo,
        reservationRepo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      REORDER_POLICY_REPO,
      PRODUCT_REPO,
      WAREHOUSE_REPO,
      LOCATION_REPO,
      STOCK_MOVE_REPO,
      STOCK_RESERVATION_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
  {
    provide: UpdateReorderPolicyUseCase,
    useFactory: (
      repo: PrismaReorderPolicyRepository,
      productRepo: PrismaProductRepository,
      warehouseRepo: PrismaWarehouseRepository,
      locationRepo: PrismaLocationRepository,
      moveRepo: PrismaStockMoveRepository,
      reservationRepo: PrismaStockReservationRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new UpdateReorderPolicyUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        productRepo,
        warehouseRepo,
        locationRepo,
        moveRepo,
        reservationRepo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      REORDER_POLICY_REPO,
      PRODUCT_REPO,
      WAREHOUSE_REPO,
      LOCATION_REPO,
      STOCK_MOVE_REPO,
      STOCK_RESERVATION_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
  {
    provide: GetReorderSuggestionsUseCase,
    useFactory: (
      repo: PrismaReorderPolicyRepository,
      productRepo: PrismaProductRepository,
      warehouseRepo: PrismaWarehouseRepository,
      locationRepo: PrismaLocationRepository,
      moveRepo: PrismaStockMoveRepository,
      reservationRepo: PrismaStockReservationRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new GetReorderSuggestionsUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        productRepo,
        warehouseRepo,
        locationRepo,
        moveRepo,
        reservationRepo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      REORDER_POLICY_REPO,
      PRODUCT_REPO,
      WAREHOUSE_REPO,
      LOCATION_REPO,
      STOCK_MOVE_REPO,
      STOCK_RESERVATION_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
  {
    provide: GetLowStockUseCase,
    useFactory: (
      repo: PrismaReorderPolicyRepository,
      productRepo: PrismaProductRepository,
      warehouseRepo: PrismaWarehouseRepository,
      locationRepo: PrismaLocationRepository,
      moveRepo: PrismaStockMoveRepository,
      reservationRepo: PrismaStockReservationRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new GetLowStockUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        productRepo,
        warehouseRepo,
        locationRepo,
        moveRepo,
        reservationRepo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      REORDER_POLICY_REPO,
      PRODUCT_REPO,
      WAREHOUSE_REPO,
      LOCATION_REPO,
      STOCK_MOVE_REPO,
      STOCK_RESERVATION_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
];
