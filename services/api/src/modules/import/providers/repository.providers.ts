import { type Provider } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaImportShipmentRepositoryAdapter } from "../infrastructure/adapters/prisma-import-shipment-repository.adapter";
import { IMPORT_SHIPMENT_REPOSITORY } from "../application/ports/import-shipment-repository.port";

export const importRepositoryProviders: Provider[] = [
  {
    provide: IMPORT_SHIPMENT_REPOSITORY,
    useFactory: (prisma: PrismaClient) => {
      return new PrismaImportShipmentRepositoryAdapter(prisma);
    },
    inject: [PrismaClient],
  },
];
