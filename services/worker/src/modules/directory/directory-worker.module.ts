import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { NotificationsModule } from "../notifications/notifications.module";
import { DirectoryLeadCreatedHandler } from "./handlers/directory-lead-created.handler";

@Module({
  imports: [DataModule, NotificationsModule],
  providers: [DirectoryLeadCreatedHandler],
  exports: [DirectoryLeadCreatedHandler],
})
export class DirectoryWorkerModule {}
