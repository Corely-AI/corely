import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { ApprovalPoliciesModule } from "../approvals/approval-policies.module";
import { DocumentsModule } from "../documents/documents.module";
import { IdentityModule } from "../identity";
import { PeopleModule } from "../people/people.module";
import { PlatformModule } from "../platform/platform.module";
import { OperationalRequestsController } from "./adapters/http/operational-requests.controller";
import { OperationalRequestsUseCase } from "./application/operational-requests.usecase";
import { OperationalRequestRepository } from "./application/ports/request-repository.port";
import { ExtOperationalRequestRepository } from "./infrastructure/ext-operational-request-repository";

@Module({
  imports: [
    KernelModule,
    DataModule,
    IdentityModule,
    PeopleModule,
    PlatformModule,
    ApprovalPoliciesModule,
    DocumentsModule,
  ],
  controllers: [OperationalRequestsController],
  exports: [OperationalRequestsUseCase],
  providers: [
    OperationalRequestsUseCase,
    { provide: OperationalRequestRepository, useClass: ExtOperationalRequestRepository },
  ],
})
export class OperationalRequestsModule {}
