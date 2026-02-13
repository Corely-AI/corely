import { type Provider } from "@nestjs/common";
import { NestLoggerAdapter } from "../../../shared/adapters/logger/nest-logger.adapter";

import { type PrismaStockMoveRepository } from "../infrastructure/adapters/prisma-stock-move-repository.adapter";
import { type PrismaStockReservationRepository } from "../infrastructure/adapters/prisma-stock-reservation-repository.adapter";
import { type PrismaLocationRepository } from "../infrastructure/adapters/prisma-location-repository.adapter";
import { type PrismaInventoryLotRepository } from "../infrastructure/adapters/prisma-inventory-lot-repository.adapter";

import { STOCK_MOVE_REPO } from "../application/ports/stock-move-repository.port";
import { STOCK_RESERVATION_REPO } from "../application/ports/stock-reservation-repository.port";
import { LOCATION_REPO } from "../application/ports/location-repository.port";
import { INVENTORY_LOT_REPO } from "../application/ports/inventory-lot-repository.port";

import { GetOnHandUseCase } from "../application/use-cases/get-on-hand.usecase";
import { GetAvailableUseCase } from "../application/use-cases/get-available.usecase";
import { ListStockMovesUseCase } from "../application/use-cases/list-stock-moves.usecase";
import { ListReservationsUseCase } from "../application/use-cases/list-reservations.usecase";
import { PickForDeliveryUseCase } from "../application/use-cases/pick-for-delivery.usecase";

export const stockProviders: Provider[] = [
  {
    provide: GetOnHandUseCase,
    useFactory: (
      moveRepo: PrismaStockMoveRepository,
      reservationRepo: PrismaStockReservationRepository,
      locationRepo: PrismaLocationRepository
    ) =>
      new GetOnHandUseCase({
        logger: new NestLoggerAdapter(),
        moveRepo,
        reservationRepo,
        locationRepo,
      }),
    inject: [STOCK_MOVE_REPO, STOCK_RESERVATION_REPO, LOCATION_REPO],
  },
  {
    provide: GetAvailableUseCase,
    useFactory: (
      moveRepo: PrismaStockMoveRepository,
      reservationRepo: PrismaStockReservationRepository,
      locationRepo: PrismaLocationRepository
    ) =>
      new GetAvailableUseCase({
        logger: new NestLoggerAdapter(),
        moveRepo,
        reservationRepo,
        locationRepo,
      }),
    inject: [STOCK_MOVE_REPO, STOCK_RESERVATION_REPO, LOCATION_REPO],
  },
  {
    provide: ListStockMovesUseCase,
    useFactory: (
      moveRepo: PrismaStockMoveRepository,
      reservationRepo: PrismaStockReservationRepository,
      locationRepo: PrismaLocationRepository
    ) =>
      new ListStockMovesUseCase({
        logger: new NestLoggerAdapter(),
        moveRepo,
        reservationRepo,
        locationRepo,
      }),
    inject: [STOCK_MOVE_REPO, STOCK_RESERVATION_REPO, LOCATION_REPO],
  },
  {
    provide: ListReservationsUseCase,
    useFactory: (
      moveRepo: PrismaStockMoveRepository,
      reservationRepo: PrismaStockReservationRepository,
      locationRepo: PrismaLocationRepository
    ) =>
      new ListReservationsUseCase({
        logger: new NestLoggerAdapter(),
        moveRepo,
        reservationRepo,
        locationRepo,
      }),
    inject: [STOCK_MOVE_REPO, STOCK_RESERVATION_REPO, LOCATION_REPO],
  },
  {
    provide: PickForDeliveryUseCase,
    useFactory: (lotRepo: PrismaInventoryLotRepository) =>
      new PickForDeliveryUseCase({
        logger: new NestLoggerAdapter(),
        lotRepo,
      }),
    inject: [INVENTORY_LOT_REPO],
  },
];
