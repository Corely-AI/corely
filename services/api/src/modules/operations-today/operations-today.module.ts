import { Module } from "@nestjs/common";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { BookingModule } from "../booking/booking.module";
import { IdentityModule } from "../identity";
import { PeopleModule } from "../people/people.module";
import { PlatformModule } from "../platform";
import { OperationalRequestsModule } from "../requests/requests.module";
import { TasksModule } from "../tasks/tasks.module";
import { WorkspacesModule } from "../workspaces";
import { OperationsTodayController } from "./adapters/operations-today.controller";
import { OperationsTodayUseCase } from "./application/operations-today.usecase";

@Module({
  imports: [
    BookingModule,
    IdentityModule,
    KernelModule,
    PeopleModule,
    PlatformModule,
    OperationalRequestsModule,
    TasksModule,
    WorkspacesModule,
  ],
  controllers: [OperationsTodayController],
  providers: [OperationsTodayUseCase],
  exports: [OperationsTodayUseCase],
})
export class OperationsTodayModule {}
