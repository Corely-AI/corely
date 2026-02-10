import { type Provider } from "@nestjs/common";
import { CreateShipmentUseCase } from "../application/use-cases/create-shipment.usecase";
import { UpdateShipmentUseCase } from "../application/use-cases/update-shipment.usecase";
import { ListShipmentsUseCase } from "../application/use-cases/list-shipments.usecase";
import { GetShipmentUseCase } from "../application/use-cases/get-shipment.usecase";
import { SubmitShipmentUseCase } from "../application/use-cases/submit-shipment.usecase";
import { ReceiveShipmentUseCase } from "../application/use-cases/receive-shipment.usecase";
import { AllocateLandedCostsUseCase } from "../application/use-cases/allocate-landed-costs.usecase";
import { IMPORT_SHIPMENT_REPOSITORY } from "../application/ports/import-shipment-repository.port";
import { NestLoggerAdapter } from "../../../shared/adapters/logger/nest-logger.adapter";
import { ID_GENERATOR_TOKEN } from "../../../shared/ports/id-generator.port";
import { CLOCK_PORT_TOKEN } from "../../../shared/ports/clock.port";
import { AUDIT_PORT_TOKEN } from "../../../shared/ports/audit.port";

export const importShipmentUseCaseProviders: Provider[] = [
  {
    provide: CreateShipmentUseCase,
    useFactory: (logger, repo, idGenerator, clock, audit) => {
      return new CreateShipmentUseCase({
        logger,
        repo,
        idGenerator,
        clock,
        audit,
      });
    },
    inject: [
      NestLoggerAdapter,
      IMPORT_SHIPMENT_REPOSITORY,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT_TOKEN,
    ],
  },
  {
    provide: UpdateShipmentUseCase,
    useFactory: (logger, repo, idGenerator, clock, audit) => {
      return new UpdateShipmentUseCase({
        logger,
        repo,
        idGenerator,
        clock,
        audit,
      });
    },
    inject: [
      NestLoggerAdapter,
      IMPORT_SHIPMENT_REPOSITORY,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT_TOKEN,
    ],
  },
  {
    provide: ListShipmentsUseCase,
    useFactory: (logger, repo) => {
      return new ListShipmentsUseCase({ logger, repo });
    },
    inject: [NestLoggerAdapter, IMPORT_SHIPMENT_REPOSITORY],
  },
  {
    provide: GetShipmentUseCase,
    useFactory: (logger, repo) => {
      return new GetShipmentUseCase({ logger, repo });
    },
    inject: [NestLoggerAdapter, IMPORT_SHIPMENT_REPOSITORY],
  },
  {
    provide: SubmitShipmentUseCase,
    useFactory: (logger, repo, clock, audit) => {
      return new SubmitShipmentUseCase({
        logger,
        repo,
        clock,
        audit,
      });
    },
    inject: [NestLoggerAdapter, IMPORT_SHIPMENT_REPOSITORY, CLOCK_PORT_TOKEN, AUDIT_PORT_TOKEN],
  },
  {
    provide: ReceiveShipmentUseCase,
    useFactory: (logger, repo, clock, audit) => {
      return new ReceiveShipmentUseCase({
        logger,
        repo,
        clock,
        audit,
      });
    },
    inject: [NestLoggerAdapter, IMPORT_SHIPMENT_REPOSITORY, CLOCK_PORT_TOKEN, AUDIT_PORT_TOKEN],
  },
  {
    provide: AllocateLandedCostsUseCase,
    useFactory: (logger, repo, clock, audit) => {
      return new AllocateLandedCostsUseCase({
        logger,
        repo,
        clock,
        audit,
      });
    },
    inject: [NestLoggerAdapter, IMPORT_SHIPMENT_REPOSITORY, CLOCK_PORT_TOKEN, AUDIT_PORT_TOKEN],
  },
];
