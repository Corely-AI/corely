import { StaffOperationsLookup } from "./application/staff-operations-lookup";
import { PlatformModule } from "../platform/platform.module";
import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { IdentityModule } from "../identity/identity.module";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { StaffAccountLookupAdapter } from "../identity/public";
import { StaffPartyLookupAdapter } from "../party/public";
import { StaffResourceLookupAdapter } from "../booking/public";
import {
  STAFF_REPOSITORY,
  STAFF_ACCOUNT_LOOKUP,
  STAFF_PARTY_LOOKUP,
  STAFF_RESOURCE_LOOKUP,
} from "./application/ports/staff-repository.port";
import { StaffDirectoryUseCase } from "./application/staff-directory.usecase";
import { ExtStaffRepositoryAdapter } from "./infrastructure/ext-staff-repository.adapter";
import { StaffController } from "./adapters/http/staff.controller";
@Module({
  imports: [DataModule, IdentityModule, WorkspacesModule, PlatformModule],
  controllers: [StaffController],
  providers: [
    StaffOperationsLookup,
    StaffDirectoryUseCase,
    ExtStaffRepositoryAdapter,
    StaffAccountLookupAdapter,
    StaffPartyLookupAdapter,
    StaffResourceLookupAdapter,
    { provide: STAFF_REPOSITORY, useExisting: ExtStaffRepositoryAdapter },
    { provide: STAFF_ACCOUNT_LOOKUP, useExisting: StaffAccountLookupAdapter },
    { provide: STAFF_PARTY_LOOKUP, useExisting: StaffPartyLookupAdapter },
    { provide: STAFF_RESOURCE_LOOKUP, useExisting: StaffResourceLookupAdapter },
  ],
  exports: [StaffDirectoryUseCase, StaffOperationsLookup],
})
export class PeopleModule {}
