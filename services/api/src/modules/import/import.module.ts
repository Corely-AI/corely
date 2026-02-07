import { Module } from "@nestjs/common";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { ImportShipmentController } from "./adapters/http/import-shipment.controller";
import { importRepositoryProviders } from "./providers/repository.providers";
import { importShipmentUseCaseProviders } from "./providers/shipment.providers";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { PrismaAuditAdapter } from "../../shared/infrastructure/persistence/prisma-audit.adapter";
import { AUDIT_PORT_TOKEN } from "../../shared/ports/audit.port";

@Module({
  imports: [KernelModule],
  controllers: [ImportShipmentController],
  providers: [
    NestLoggerAdapter,
    PrismaAuditAdapter,
    { provide: AUDIT_PORT_TOKEN, useExisting: PrismaAuditAdapter },
    ...importRepositoryProviders,
    ...importShipmentUseCaseProviders,
  ],
  exports: [],
})
export class ImportModule {}
