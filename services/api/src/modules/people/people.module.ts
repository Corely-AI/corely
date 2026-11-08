import { StaffSelfServiceUseCase } from "./application/staff-self-service.usecase";
import { StaffLifecycleUseCase } from "./application/staff-lifecycle.usecase";
import { StaffSelfServiceController } from "./adapters/http/staff-self-service.controller";
import { ExtStaffLifecycleAdapter } from "./infrastructure/ext-staff-lifecycle.adapter";
import { StaffTasksAdapter } from "../tasks/public";
import { StaffWorkspaceAccessAdapter } from "../workspaces/public";
import {
  STAFF_TASKS,
  STAFF_WORKSPACE_ACCESS,
  STAFF_LIFECYCLE_REPOSITORY,
} from "./application/ports/staff-lifecycle.port";
import { StaffWorkdayLookup } from "./application/staff-workday-lookup";
import { StaffOperationsLookup } from "./application/staff-operations-lookup";
import { PlatformModule } from "../platform/platform.module";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { IdentityModule } from "../identity/identity.module";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { StaffAccountLookupAdapter } from "../identity/public";
import { StaffPartyLookupAdapter } from "../party/public";
import { StaffAvailabilityUseCase } from "./application/staff-availability.usecase";
import { StaffAvailabilityConstraintService } from "./application/staff-availability-constraint.service";
import { ExtStaffAvailabilityAdapter } from "./infrastructure/ext-staff-availability.adapter";
import {
  STAFF_AVAILABILITY_REPOSITORY,
  STAFF_BOOKING,
} from "./application/ports/staff-availability.port";
import { StaffBookingAdapter } from "../booking/public";
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
  imports: [DataModule, IdentityModule, WorkspacesModule, PlatformModule, KernelModule],
  controllers: [StaffSelfServiceController, StaffController],
  providers: [
    StaffSelfServiceUseCase,
    StaffLifecycleUseCase,
    ExtStaffLifecycleAdapter,
    StaffTasksAdapter,
    StaffWorkspaceAccessAdapter,
    { provide: STAFF_TASKS, useExisting: StaffTasksAdapter },
    { provide: STAFF_WORKSPACE_ACCESS, useExisting: StaffWorkspaceAccessAdapter },
    { provide: STAFF_LIFECYCLE_REPOSITORY, useExisting: ExtStaffLifecycleAdapter },
    StaffOperationsLookup,
    StaffWorkdayLookup,
    StaffDirectoryUseCase,
    StaffAvailabilityUseCase,
    StaffAvailabilityConstraintService,
    StaffBookingAdapter,
    ExtStaffAvailabilityAdapter,
    { provide: STAFF_BOOKING, useExisting: StaffBookingAdapter },
    { provide: STAFF_AVAILABILITY_REPOSITORY, useExisting: ExtStaffAvailabilityAdapter },
    ExtStaffRepositoryAdapter,
    StaffAccountLookupAdapter,
    StaffPartyLookupAdapter,
    StaffResourceLookupAdapter,
    { provide: STAFF_REPOSITORY, useExisting: ExtStaffRepositoryAdapter },
    { provide: STAFF_ACCOUNT_LOOKUP, useExisting: StaffAccountLookupAdapter },
    { provide: STAFF_PARTY_LOOKUP, useExisting: StaffPartyLookupAdapter },
    { provide: STAFF_RESOURCE_LOOKUP, useExisting: StaffResourceLookupAdapter },
  ],
  exports: [
    StaffDirectoryUseCase,
    StaffOperationsLookup,
    StaffWorkdayLookup,
    StaffAvailabilityConstraintService,
  ],
})
export class PeopleModule {}
