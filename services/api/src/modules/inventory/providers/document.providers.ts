import { type Provider } from "@nestjs/common";
import { AUDIT_PORT, type AuditPort } from "@corely/kernel";
import { NestLoggerAdapter } from "../../../shared/adapters/logger/nest-logger.adapter";
import {
  type IdempotencyStoragePort,
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
} from "../../../shared/ports/idempotency-storage.port";
import { ID_GENERATOR_TOKEN } from "../../../shared/ports/id-generator.port";
import { CLOCK_PORT_TOKEN } from "../../../shared/ports/clock.port";

import { type PrismaProductRepository } from "../infrastructure/adapters/prisma-product-repository.adapter";
import { type PrismaWarehouseRepository } from "../infrastructure/adapters/prisma-warehouse-repository.adapter";
import { type PrismaLocationRepository } from "../infrastructure/adapters/prisma-location-repository.adapter";
import { type PrismaInventoryDocumentRepository } from "../infrastructure/adapters/prisma-document-repository.adapter";
import { type PrismaStockMoveRepository } from "../infrastructure/adapters/prisma-stock-move-repository.adapter";
import { type PrismaStockReservationRepository } from "../infrastructure/adapters/prisma-stock-reservation-repository.adapter";
import { type PrismaInventorySettingsRepository } from "../infrastructure/adapters/prisma-settings-repository.adapter";

import { PRODUCT_REPO } from "../application/ports/product-repository.port";
import { WAREHOUSE_REPO } from "../application/ports/warehouse-repository.port";
import { LOCATION_REPO } from "../application/ports/location-repository.port";
import { DOCUMENT_REPO } from "../application/ports/document-repository.port";
import { STOCK_MOVE_REPO } from "../application/ports/stock-move-repository.port";
import { STOCK_RESERVATION_REPO } from "../application/ports/stock-reservation-repository.port";
import { INVENTORY_SETTINGS_REPO } from "../application/ports/settings-repository.port";

import {
  CreateInventoryDocumentUseCase,
  UpdateInventoryDocumentUseCase,
  ConfirmInventoryDocumentUseCase,
  PostInventoryDocumentUseCase,
  CancelInventoryDocumentUseCase,
  GetInventoryDocumentUseCase,
  ListInventoryDocumentsUseCase,
} from "../application/use-cases/documents.usecases";

export const documentProviders: Provider[] = [
  {
    provide: CreateInventoryDocumentUseCase,
    useFactory: (
      repo: PrismaInventoryDocumentRepository,
      productRepo: PrismaProductRepository,
      locationRepo: PrismaLocationRepository,
      warehouseRepo: PrismaWarehouseRepository,
      moveRepo: PrismaStockMoveRepository,
      reservationRepo: PrismaStockReservationRepository,
      settingsRepo: PrismaInventorySettingsRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new CreateInventoryDocumentUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        productRepo,
        locationRepo,
        warehouseRepo,
        moveRepo,
        reservationRepo,
        settingsRepo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      DOCUMENT_REPO,
      PRODUCT_REPO,
      LOCATION_REPO,
      WAREHOUSE_REPO,
      STOCK_MOVE_REPO,
      STOCK_RESERVATION_REPO,
      INVENTORY_SETTINGS_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
  {
    provide: UpdateInventoryDocumentUseCase,
    useFactory: (
      repo: PrismaInventoryDocumentRepository,
      productRepo: PrismaProductRepository,
      locationRepo: PrismaLocationRepository,
      warehouseRepo: PrismaWarehouseRepository,
      moveRepo: PrismaStockMoveRepository,
      reservationRepo: PrismaStockReservationRepository,
      settingsRepo: PrismaInventorySettingsRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new UpdateInventoryDocumentUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        productRepo,
        locationRepo,
        warehouseRepo,
        moveRepo,
        reservationRepo,
        settingsRepo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      DOCUMENT_REPO,
      PRODUCT_REPO,
      LOCATION_REPO,
      WAREHOUSE_REPO,
      STOCK_MOVE_REPO,
      STOCK_RESERVATION_REPO,
      INVENTORY_SETTINGS_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
  {
    provide: ConfirmInventoryDocumentUseCase,
    useFactory: (
      repo: PrismaInventoryDocumentRepository,
      productRepo: PrismaProductRepository,
      locationRepo: PrismaLocationRepository,
      warehouseRepo: PrismaWarehouseRepository,
      moveRepo: PrismaStockMoveRepository,
      reservationRepo: PrismaStockReservationRepository,
      settingsRepo: PrismaInventorySettingsRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new ConfirmInventoryDocumentUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        productRepo,
        locationRepo,
        warehouseRepo,
        moveRepo,
        reservationRepo,
        settingsRepo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      DOCUMENT_REPO,
      PRODUCT_REPO,
      LOCATION_REPO,
      WAREHOUSE_REPO,
      STOCK_MOVE_REPO,
      STOCK_RESERVATION_REPO,
      INVENTORY_SETTINGS_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
  {
    provide: PostInventoryDocumentUseCase,
    useFactory: (
      repo: PrismaInventoryDocumentRepository,
      productRepo: PrismaProductRepository,
      locationRepo: PrismaLocationRepository,
      warehouseRepo: PrismaWarehouseRepository,
      moveRepo: PrismaStockMoveRepository,
      reservationRepo: PrismaStockReservationRepository,
      settingsRepo: PrismaInventorySettingsRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new PostInventoryDocumentUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        productRepo,
        locationRepo,
        warehouseRepo,
        moveRepo,
        reservationRepo,
        settingsRepo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      DOCUMENT_REPO,
      PRODUCT_REPO,
      LOCATION_REPO,
      WAREHOUSE_REPO,
      STOCK_MOVE_REPO,
      STOCK_RESERVATION_REPO,
      INVENTORY_SETTINGS_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
  {
    provide: CancelInventoryDocumentUseCase,
    useFactory: (
      repo: PrismaInventoryDocumentRepository,
      productRepo: PrismaProductRepository,
      locationRepo: PrismaLocationRepository,
      warehouseRepo: PrismaWarehouseRepository,
      moveRepo: PrismaStockMoveRepository,
      reservationRepo: PrismaStockReservationRepository,
      settingsRepo: PrismaInventorySettingsRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new CancelInventoryDocumentUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        productRepo,
        locationRepo,
        warehouseRepo,
        moveRepo,
        reservationRepo,
        settingsRepo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      DOCUMENT_REPO,
      PRODUCT_REPO,
      LOCATION_REPO,
      WAREHOUSE_REPO,
      STOCK_MOVE_REPO,
      STOCK_RESERVATION_REPO,
      INVENTORY_SETTINGS_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
  {
    provide: GetInventoryDocumentUseCase,
    useFactory: (
      repo: PrismaInventoryDocumentRepository,
      productRepo: PrismaProductRepository,
      locationRepo: PrismaLocationRepository,
      warehouseRepo: PrismaWarehouseRepository,
      moveRepo: PrismaStockMoveRepository,
      reservationRepo: PrismaStockReservationRepository,
      settingsRepo: PrismaInventorySettingsRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new GetInventoryDocumentUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        productRepo,
        locationRepo,
        warehouseRepo,
        moveRepo,
        reservationRepo,
        settingsRepo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      DOCUMENT_REPO,
      PRODUCT_REPO,
      LOCATION_REPO,
      WAREHOUSE_REPO,
      STOCK_MOVE_REPO,
      STOCK_RESERVATION_REPO,
      INVENTORY_SETTINGS_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
  {
    provide: ListInventoryDocumentsUseCase,
    useFactory: (
      repo: PrismaInventoryDocumentRepository,
      productRepo: PrismaProductRepository,
      locationRepo: PrismaLocationRepository,
      warehouseRepo: PrismaWarehouseRepository,
      moveRepo: PrismaStockMoveRepository,
      reservationRepo: PrismaStockReservationRepository,
      settingsRepo: PrismaInventorySettingsRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new ListInventoryDocumentsUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        productRepo,
        locationRepo,
        warehouseRepo,
        moveRepo,
        reservationRepo,
        settingsRepo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      DOCUMENT_REPO,
      PRODUCT_REPO,
      LOCATION_REPO,
      WAREHOUSE_REPO,
      STOCK_MOVE_REPO,
      STOCK_RESERVATION_REPO,
      INVENTORY_SETTINGS_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
];
