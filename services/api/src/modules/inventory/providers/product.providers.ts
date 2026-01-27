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
import { PRODUCT_REPO } from "../application/ports/product-repository.port";

import {
  CreateProductUseCase,
  UpdateProductUseCase,
  ActivateProductUseCase,
  DeactivateProductUseCase,
  GetProductUseCase,
  ListProductsUseCase,
} from "../application/use-cases/products.usecases";

export const productProviders: Provider[] = [
  {
    provide: CreateProductUseCase,
    useFactory: (
      repo: PrismaProductRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new CreateProductUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      PRODUCT_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
  {
    provide: UpdateProductUseCase,
    useFactory: (
      repo: PrismaProductRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new UpdateProductUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      PRODUCT_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
  {
    provide: ActivateProductUseCase,
    useFactory: (
      repo: PrismaProductRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new ActivateProductUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      PRODUCT_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
  {
    provide: DeactivateProductUseCase,
    useFactory: (
      repo: PrismaProductRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new DeactivateProductUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      PRODUCT_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
  {
    provide: GetProductUseCase,
    useFactory: (
      repo: PrismaProductRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new GetProductUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      PRODUCT_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
  {
    provide: ListProductsUseCase,
    useFactory: (
      repo: PrismaProductRepository,
      idempotency: IdempotencyStoragePort,
      idGen: any,
      clock: any,
      audit: AuditPort
    ) =>
      new ListProductsUseCase({
        logger: new NestLoggerAdapter(),
        repo,
        idempotency,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      PRODUCT_REPO,
      IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
];
