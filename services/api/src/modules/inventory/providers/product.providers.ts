import { type Provider } from "@nestjs/common";
import { AUDIT_PORT, type AuditPort, type ClockPort, type IdGeneratorPort } from "@corely/kernel";
import { NestLoggerAdapter } from "../../../shared/adapters/logger/nest-logger.adapter";
import {
  type IdempotencyStoragePort,
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
} from "../../../shared/ports/idempotency-storage.port";
import { ID_GENERATOR_TOKEN } from "../../../shared/ports/id-generator.port";
import { CLOCK_PORT_TOKEN } from "../../../shared/ports/clock.port";

import { type PrismaProductRepository } from "../infrastructure/adapters/prisma-product-repository.adapter";
import { PRODUCT_REPO } from "../application/ports/product-repository.port";

import { CreateProductUseCase } from "../application/use-cases/create-product.usecase";
import { UpdateProductUseCase } from "../application/use-cases/update-product.usecase";
import { ActivateProductUseCase } from "../application/use-cases/activate-product.usecase";
import { DeactivateProductUseCase } from "../application/use-cases/deactivate-product.usecase";
import { GetProductUseCase } from "../application/use-cases/get-product.usecase";
import { ListProductsUseCase } from "../application/use-cases/list-products.usecase";

export const productProviders: Provider[] = [
  {
    provide: CreateProductUseCase,
    useFactory: (
      repo: PrismaProductRepository,
      idempotency: IdempotencyStoragePort,
      idGen: IdGeneratorPort,
      clock: ClockPort,
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
      idGen: IdGeneratorPort,
      clock: ClockPort,
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
      idGen: IdGeneratorPort,
      clock: ClockPort,
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
      idGen: IdGeneratorPort,
      clock: ClockPort,
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
      idGen: IdGeneratorPort,
      clock: ClockPort,
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
      idGen: IdGeneratorPort,
      clock: ClockPort,
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
