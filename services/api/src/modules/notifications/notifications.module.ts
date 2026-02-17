import { Module } from "@nestjs/common";
import { NotificationsController } from "./http/notifications.controller";
import { ListNotificationsUseCase } from "./application/use-cases/list-notifications.usecase";
import { GetUnreadCountUseCase } from "./application/use-cases/get-unread-count.usecase";
import { MarkReadUseCase } from "./application/use-cases/mark-read.usecase";
import { MarkAllReadUseCase } from "./application/use-cases/mark-all-read.usecase";
import { PrismaNotificationRepository } from "./infrastructure/prisma-notification.repository";
import { NOTIFICATION_REPOSITORY } from "./application/ports/notification.repository.port";
import { SharedModule } from "../../shared/shared.module";

@Module({
  imports: [SharedModule],
  controllers: [NotificationsController],
  providers: [
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
