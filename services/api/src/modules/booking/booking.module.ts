import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { EnvService } from "@corely/config";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { IdentityModule } from "../identity"; // Assuming required for AuthGuard
import { CrmModule } from "../crm"; // Depending on bounded boundary imports

import { BookingResourceController } from "./http/resource.controller";
import { BookingServiceController } from "./http/service.controller";
import { BookingController } from "./http/booking.controller";
import { BookingAvailabilityController } from "./http/availability.controller";
import { PublicBookingController } from "./http/public-booking.controller";

import { PrismaResourceRepoAdapter } from "./infrastructure/adapters/prisma-resource-repo.adapter";
import { PrismaServiceRepoAdapter } from "./infrastructure/adapters/prisma-service-repo.adapter";
import { PrismaBookingRepoAdapter } from "./infrastructure/adapters/prisma-booking-repo.adapter";
import { PrismaHoldRepoAdapter } from "./infrastructure/adapters/prisma-hold-repo.adapter";
import { PrismaAvailabilityRuleRepoAdapter } from "./infrastructure/adapters/prisma-availability-rule-repo.adapter";
import { ResendBookingNotificationAdapter } from "./infrastructure/adapters/resend-booking-notification.adapter";

import {
  RESOURCE_REPOSITORY,
  SERVICE_REPOSITORY,
  BOOKING_REPOSITORY,
  HOLD_REPOSITORY,
  AVAILABILITY_RULE_REPOSITORY,
} from "./application/ports/booking-repo.ports";
import { BOOKING_NOTIFICATION_PORT } from "./application/ports/booking-notification.port";
import {
  AUDIT_PORT,
  OUTBOX_PORT,
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
  ID_GENERATOR_TOKEN,
  CLOCK_PORT_TOKEN,
} from "@corely/kernel";

import { CreateResourceUseCase } from "./application/use-cases/create-resource.usecase";
import { UpdateResourceUseCase } from "./application/use-cases/update-resource.usecase";
import { ListResourcesUseCase } from "./application/use-cases/list-resources.usecase";
import { GetResourceUseCase } from "./application/use-cases/get-resource.usecase";
import { DeleteResourceUseCase } from "./application/use-cases/delete-resource.usecase";

import { CreateServiceOfferingUseCase } from "./application/use-cases/create-service.usecase";
import { UpdateServiceOfferingUseCase } from "./application/use-cases/update-service.usecase";
import { ListServiceOfferingsUseCase } from "./application/use-cases/list-services.usecase";
import { GetServiceOfferingUseCase } from "./application/use-cases/get-service.usecase";
import { DeleteServiceOfferingUseCase } from "./application/use-cases/delete-service.usecase";

import { CreateBookingUseCase } from "./application/use-cases/create-booking.usecase";
import { CreateHoldUseCase } from "./application/use-cases/create-hold.usecase";
import { ListBookingsUseCase } from "./application/use-cases/list-bookings.usecase";
import { GetBookingUseCase } from "./application/use-cases/get-booking.usecase";
import { RescheduleBookingUseCase } from "./application/use-cases/reschedule-booking.usecase";
import { CancelBookingUseCase } from "./application/use-cases/cancel-booking.usecase";

import { UpsertAvailabilityRuleUseCase } from "./application/use-cases/upsert-availability-rule.usecase";
import { GetAvailabilityUseCase } from "./application/use-cases/get-availability.usecase";

@Module({
  imports: [DataModule, KernelModule, IdentityModule, CrmModule],
  controllers: [
    BookingResourceController,
    BookingServiceController,
    BookingController,
    BookingAvailabilityController,
    PublicBookingController,
  ],
  providers: [
    { provide: RESOURCE_REPOSITORY, useClass: PrismaResourceRepoAdapter },
    { provide: SERVICE_REPOSITORY, useClass: PrismaServiceRepoAdapter },
    { provide: BOOKING_REPOSITORY, useClass: PrismaBookingRepoAdapter },
    { provide: HOLD_REPOSITORY, useClass: PrismaHoldRepoAdapter },
    { provide: AVAILABILITY_RULE_REPOSITORY, useClass: PrismaAvailabilityRuleRepoAdapter },
    {
      provide: BOOKING_NOTIFICATION_PORT,
      useFactory: (env: EnvService) => {
        const provider = env.EMAIL_PROVIDER;
        if (provider !== "resend") {
          throw new Error(`Unsupported email provider for booking: ${provider}`);
        }
        return new ResendBookingNotificationAdapter(
          env.RESEND_API_KEY,
          env.RESEND_FROM,
          env.RESEND_REPLY_TO
        );
      },
      inject: [EnvService],
    },

    // Resource Use Cases
    {
      provide: CreateResourceUseCase,
      useFactory: (repo, audit, outbox, idempotency, idgen, clock) =>
        new CreateResourceUseCase(repo, audit, outbox, idempotency, idgen, clock),
      inject: [
        RESOURCE_REPOSITORY,
        AUDIT_PORT,
        OUTBOX_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: UpdateResourceUseCase,
      useFactory: (repo, audit, clock) => new UpdateResourceUseCase(repo, audit, clock),
      inject: [RESOURCE_REPOSITORY, AUDIT_PORT, CLOCK_PORT_TOKEN],
    },
    {
      provide: ListResourcesUseCase,
      useFactory: (repo) => new ListResourcesUseCase(repo),
      inject: [RESOURCE_REPOSITORY],
    },
    {
      provide: GetResourceUseCase,
      useFactory: (repo) => new GetResourceUseCase(repo),
      inject: [RESOURCE_REPOSITORY],
    },
    {
      provide: DeleteResourceUseCase,
      useFactory: (repo, audit) => new DeleteResourceUseCase(repo, audit),
      inject: [RESOURCE_REPOSITORY, AUDIT_PORT],
    },

    // Service Use Cases
    {
      provide: CreateServiceOfferingUseCase,
      useFactory: (repo, audit, outbox, idempotency, idgen, clock) =>
        new CreateServiceOfferingUseCase(repo, audit, outbox, idempotency, idgen, clock),
      inject: [
        SERVICE_REPOSITORY,
        AUDIT_PORT,
        OUTBOX_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: UpdateServiceOfferingUseCase,
      useFactory: (repo, audit) => new UpdateServiceOfferingUseCase(repo, audit),
      inject: [SERVICE_REPOSITORY, AUDIT_PORT],
    },
    {
      provide: ListServiceOfferingsUseCase,
      useFactory: (repo) => new ListServiceOfferingsUseCase(repo),
      inject: [SERVICE_REPOSITORY],
    },
    {
      provide: GetServiceOfferingUseCase,
      useFactory: (repo) => new GetServiceOfferingUseCase(repo),
      inject: [SERVICE_REPOSITORY],
    },
    {
      provide: DeleteServiceOfferingUseCase,
      useFactory: (repo, audit) => new DeleteServiceOfferingUseCase(repo, audit),
      inject: [SERVICE_REPOSITORY, AUDIT_PORT],
    },

    // Booking Use Cases
    {
      provide: CreateHoldUseCase,
      useFactory: (holdRepo, bookingRepo, resourceRepo, idempotency, idgen, clock) =>
        new CreateHoldUseCase(holdRepo, bookingRepo, resourceRepo, idempotency, idgen, clock),
      inject: [
        HOLD_REPOSITORY,
        BOOKING_REPOSITORY,
        RESOURCE_REPOSITORY,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: CreateBookingUseCase,
      useFactory: (bookingRepo, holdRepo, resourceRepo, audit, outbox, idempotency, idgen, clock) =>
        new CreateBookingUseCase(
          bookingRepo,
          holdRepo,
          resourceRepo,
          audit,
          outbox,
          idempotency,
          idgen,
          clock
        ),
      inject: [
        BOOKING_REPOSITORY,
        HOLD_REPOSITORY,
        RESOURCE_REPOSITORY,
        AUDIT_PORT,
        OUTBOX_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: RescheduleBookingUseCase,
      useFactory: (bookingRepo, audit, outbox, idgen, clock) =>
        new RescheduleBookingUseCase(bookingRepo, audit, outbox, idgen, clock),
      inject: [BOOKING_REPOSITORY, AUDIT_PORT, OUTBOX_PORT, ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN],
    },
    {
      provide: CancelBookingUseCase,
      useFactory: (bookingRepo, audit, outbox) =>
        new CancelBookingUseCase(bookingRepo, audit, outbox),
      inject: [BOOKING_REPOSITORY, AUDIT_PORT, OUTBOX_PORT],
    },
    {
      provide: ListBookingsUseCase,
      useFactory: (repo) => new ListBookingsUseCase(repo),
      inject: [BOOKING_REPOSITORY],
    },
    {
      provide: GetBookingUseCase,
      useFactory: (repo) => new GetBookingUseCase(repo),
      inject: [BOOKING_REPOSITORY],
    },

    // Availability Use Cases
    {
      provide: UpsertAvailabilityRuleUseCase,
      useFactory: (ruleRepo, resourceRepo, audit, clock, idgen) =>
        new UpsertAvailabilityRuleUseCase(ruleRepo, resourceRepo, audit, clock, idgen),
      inject: [
        AVAILABILITY_RULE_REPOSITORY,
        RESOURCE_REPOSITORY,
        AUDIT_PORT,
        CLOCK_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
      ],
    },
    {
      provide: GetAvailabilityUseCase,
      useFactory: (ruleRepo, bookingRepo, resourceRepo) =>
        new GetAvailabilityUseCase(ruleRepo, bookingRepo, resourceRepo),
      inject: [AVAILABILITY_RULE_REPOSITORY, BOOKING_REPOSITORY, RESOURCE_REPOSITORY],
    },
  ],
  exports: [],
})
export class BookingModule {}
