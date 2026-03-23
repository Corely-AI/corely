import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { CoachingEngagementsModule } from "../../../../coaching-engagements";
import { PartyModule } from "../../../../party";
import { CoachingPrepReminderRunnerService } from "./coaching-prep-reminder-runner.service";
import { PrepFormDispatchService } from "./services/prep-form-dispatch.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { KernelModule } from "../../../../../shared/kernel/kernel.module";

@Module({
  imports: [DataModule, KernelModule, CoachingEngagementsModule, PartyModule, NotificationsModule],
  providers: [PrepFormDispatchService, CoachingPrepReminderRunnerService],
  exports: [PrepFormDispatchService, CoachingPrepReminderRunnerService],
})
export class CoachingWorkerModule {}
