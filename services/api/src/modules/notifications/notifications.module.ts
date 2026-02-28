import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { IdentityModule } from "../identity";
import { PlatformModule } from "../platform";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { NotificationsController } from "./http/notifications.controller";
import { ListNotificationsUseCase } from "./application/use-cases/list-notifications.usecase";
import { GetUnreadCountUseCase } from "./application/use-cases/get-unread-count.usecase";
import { MarkReadUseCase } from "./application/use-cases/mark-read.usecase";
import { MarkAllReadUseCase } from "./application/use-cases/mark-all-read.usecase";
import { PrismaNotificationRepository } from "./infrastructure/prisma-notification.repository";
import { NOTIFICATION_REPOSITORY } from "./application/ports/notification.repository.port";
import { SseStreamFactory } from "../../shared/sse";

@Module({
  imports: [DataModule, IdentityModule, PlatformModule, WorkspacesModule],
  controllers: [NotificationsController],
  providers: [
    SseStreamFactory,
    ListNotificationsUseCase,
    GetUnreadCountUseCase,
    MarkReadUseCase,
    MarkAllReadUseCase,
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: PrismaNotificationRepository,
    },
  ],
  exports: [],
})
export class NotificationsModule {}
