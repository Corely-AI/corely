import { type Provider } from "@nestjs/common";
import { CreateShipmentUseCase } from "../application/use-cases/create-shipment.usecase";
import { UpdateShipmentUseCase } from "../application/use-cases/update-shipment.usecase";
import { ListShipmentsUseCase } from "../application/use-cases/list-shipments.usecase";
import { GetShipmentUseCase } from "../application/use-cases/get-shipment.usecase";
import { SubmitShipmentUseCase } from "../application/use-cases/submit-shipment.usecase";
import { ReceiveShipmentUseCase } from "../application/use-cases/receive-shipment.usecase";
import { IMPORT_SHIPMENT_REPOSITORY } from "../application/ports/import-shipment-repository.port";
import { LOGGER, ID_GENERATOR, CLOCK, AUDIT } from "@corely/kernel/symbols";

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
    inject: [LOGGER, IMPORT_SHIPMENT_REPOSITORY, ID_GENERATOR, CLOCK, AUDIT],
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
    inject: [LOGGER, IMPORT_SHIPMENT_REPOSITORY, ID_GENERATOR, CLOCK, AUDIT],
  },
  {
    provide: ListShipmentsUseCase,
    useFactory: (logger, repo) => {
      return new ListShipmentsUseCase({ logger, repo });
    },
    inject: [LOGGER, IMPORT_SHIPMENT_REPOSITORY],
  },
  {
    provide: GetShipmentUseCase,
    useFactory: (logger, repo) => {
      return new GetShipmentUseCase({ logger, repo });
    },
    inject: [LOGGER, IMPORT_SHIPMENT_REPOSITORY],
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
    inject: [LOGGER, IMPORT_SHIPMENT_REPOSITORY, CLOCK, AUDIT],
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
    inject: [LOGGER, IMPORT_SHIPMENT_REPOSITORY, CLOCK, AUDIT],
  },
];
