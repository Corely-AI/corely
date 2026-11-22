import { Module } from "@nestjs/common";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { BookingModule } from "../booking";
import { IdentityModule } from "../identity";
import { PeopleModule } from "../people/people.module";
import { PlatformModule } from "../platform/platform.module";
import { TasksModule } from "../tasks/tasks.module";
import { WorkspacesModule } from "../workspaces";
import { DailyOperationsBrief } from "./application/daily-operations-brief";
import { CliDayBriefController } from "./http/cli-day-brief.controller";

@Module({
  imports: [
    KernelModule,
    BookingModule,
    IdentityModule,
    PeopleModule,
    PlatformModule,
    TasksModule,
    WorkspacesModule,
  ],
  controllers: [CliDayBriefController],
  providers: [DailyOperationsBrief],
  exports: [DailyOperationsBrief],
})
export class OperationsBriefModule {}
