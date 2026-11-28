import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { DocumentsModule } from "../documents/documents.module";
import { IdentityModule } from "../identity/identity.module";
import { PlatformModule } from "../platform/platform.module";
import { ProceduresController } from "./adapters/http/procedures.controller";
import { PROCEDURE_REPOSITORY } from "./application/ports/procedure-repository.port";
import { ProceduresUseCase } from "./application/procedures.usecase";
import { ExtProcedureRepository } from "./infrastructure/ext-procedure-repository.adapter";

@Module({
  imports: [KernelModule, DataModule, DocumentsModule, IdentityModule, PlatformModule],
  controllers: [ProceduresController],
  providers: [
    ProceduresUseCase,
    { provide: PROCEDURE_REPOSITORY, useClass: ExtProcedureRepository },
  ],
})
export class KnowledgeModule {}
