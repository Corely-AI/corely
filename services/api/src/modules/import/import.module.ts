import { Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { KernelModule } from "@corely/kernel/nestjs";
import { ImportShipmentController } from "./adapters/http/import-shipment.controller";
import { importRepositoryProviders } from "./providers/repository.providers";
import { importShipmentUseCaseProviders } from "./providers/shipment.providers";

@Module({
  imports: [KernelModule],
  controllers: [ImportShipmentController],
  providers: [PrismaClient, ...importRepositoryProviders, ...importShipmentUseCaseProviders],
  exports: [],
})
export class ImportModule {}
