import { type Provider } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { PrismaImportShipmentRepositoryAdapter } from "../infrastructure/adapters/prisma-import-shipment-repository.adapter";
import { IMPORT_SHIPMENT_REPOSITORY } from "../application/ports/import-shipment-repository.port";

export const importRepositoryProviders: Provider[] = [
  {
    provide: IMPORT_SHIPMENT_REPOSITORY,
    useFactory: (prisma: PrismaService) => {
      return new PrismaImportShipmentRepositoryAdapter(prisma);
    },
    inject: [PrismaService],
  },
];
