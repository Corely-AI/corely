import { Module } from "@nestjs/common";
import { FormsEventHandler } from "./forms-event.handler";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  providers: [FormsEventHandler],
  exports: [FormsEventHandler],
})
export class FormsWorkerModule {}
