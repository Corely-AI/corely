import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { BookingModule } from "../booking";
import { IdentityModule } from "../identity";
import { PlatformModule } from "../platform";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { NotificationsController } from "./http/notifications.controller";
import { ListNotificationsUseCase } from "./application/use-cases/list-notifications.usecase";
import { GetUnreadCountUseCase } from "./application/use-cases/get-unread-count.usecase";
import { MarkReadUseCase } from "./application/use-cases/mark-read.usecase";
import { MarkAllReadUseCase } from "./application/use-cases/mark-all-read.usecase";
import { PublishNotificationUseCase } from "./application/use-cases/publish-notification.usecase";
import { PrismaNotificationRepository } from "./infrastructure/prisma-notification.repository";
import { NOTIFICATION_REPOSITORY } from "./application/ports/notification.repository.port";
import { APPOINTMENT_DELIVERY_STORE } from "./application/ports/appointment-delivery.port";
import { AppointmentDeliveryUseCase } from "./application/use-cases/appointment-delivery.usecase";
import { PrismaAppointmentDeliveryStore } from "./infrastructure/prisma-appointment-delivery.store";

@Module({
  imports: [DataModule, KernelModule, IdentityModule, PlatformModule, WorkspacesModule, BookingModule],
  controllers: [NotificationsController],
  providers: [
    PublishNotificationUseCase,
    ListNotificationsUseCase,
    GetUnreadCountUseCase,
    MarkReadUseCase,
    MarkAllReadUseCase,
    AppointmentDeliveryUseCase,
    { provide: APPOINTMENT_DELIVERY_STORE, useClass: PrismaAppointmentDeliveryStore },
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: PrismaNotificationRepository,
    },
  ],
  exports: [AppointmentDeliveryUseCase, PublishNotificationUseCase],
})
export class NotificationsModule {}
