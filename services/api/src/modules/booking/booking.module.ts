import { BookingSourceAccess } from "./application/use-cases/booking-source-access.usecase";
import { PlatformModule } from "../platform/platform.module";
import { PeopleModule } from "../people/people.module";
import { BookingStaffConstraintAdapter } from "./infrastructure/adapters/booking-staff-constraint.adapter";
import { OpenBukRateLimitGuard } from "./http/openbuk-rate-limit.guard";
import { WorkspacesModule } from "../workspaces";
import { OpenBukStudioUseCase } from "./application/use-cases/openbuk-studio.usecase";
import { OpenBukAppointmentChangeUseCase } from "./application/use-cases/openbuk-appointment-change.usecase";
import { OpenBukAgendaCommandsUseCase } from "./application/use-cases/openbuk-agenda-commands.usecase";
import { OpenBukGuestCredentials } from "./application/use-cases/openbuk-guest-credentials";
import { OpenBukGuestManagementUseCase } from "./application/use-cases/openbuk-guest-management.usecase";
import { OpenBukManagementController } from "./http/openbuk-management.controller";
import {
  OPENBUK_GUEST_ACCESS_STORE,
  OPENBUK_GUEST_SIGNING_SECRET,
} from "./application/ports/openbuk-guest-access.port";
import { OpenBukGuestAccessAdapter } from "./infrastructure/adapters/openbuk-guest-access.adapter";
import { OpenBukAdminController, OpenBukPublicController } from "./http/openbuk.controller";
import { OPENBUK_REPOSITORY } from "./application/ports/openbuk-repository.port";
import { PrismaOpenBukRepositoryAdapter } from "./infrastructure/adapters/prisma-openbuk-repository.adapter";
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
import { LegacyPublicBookingAvailabilityUseCase } from "./application/use-cases/legacy-public-booking-availability.usecase";
import { LegacyPublicBookingPageReader } from "./infrastructure/adapters/legacy-public-booking-page-reader";

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
  UNIT_OF_WORK,
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

import { BOOKING_POLICIES } from "./application/booking-policy";
import { bookingPolicies } from "./booking-extensions";

@Module({
  imports: [
    PeopleModule,
    WorkspacesModule,
    DataModule,
    KernelModule,
    IdentityModule,
    CrmModule,
    PlatformModule,
  ],
  controllers: [
    OpenBukAdminController,
    OpenBukPublicController,
    OpenBukManagementController,
    BookingResourceController,
    BookingServiceController,
    BookingController,
    BookingAvailabilityController,
    PublicBookingController,
  ],
  providers: [
    BookingSourceAccess,
    { provide: BOOKING_POLICIES, useValue: bookingPolicies },
    BookingStaffConstraintAdapter,
    OpenBukRateLimitGuard,
    LegacyPublicBookingAvailabilityUseCase,
    LegacyPublicBookingPageReader,
    OpenBukStudioUseCase,
    OpenBukAppointmentChangeUseCase,
    OpenBukAgendaCommandsUseCase,
    OpenBukGuestCredentials,
    OpenBukGuestManagementUseCase,
    { provide: OPENBUK_GUEST_ACCESS_STORE, useClass: OpenBukGuestAccessAdapter },
    {
      provide: OPENBUK_GUEST_SIGNING_SECRET,
      useFactory: (env: EnvService) => env.JWT_SECRET ?? "",
      inject: [EnvService],
    },
    { provide: OPENBUK_REPOSITORY, useClass: PrismaOpenBukRepositoryAdapter },
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
      useFactory: (holdRepo, bookingRepo, idempotency, idgen, clock, uow) =>
        new CreateHoldUseCase(holdRepo, bookingRepo, idempotency, idgen, clock, uow),
      inject: [
        HOLD_REPOSITORY,
        BOOKING_REPOSITORY,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        UNIT_OF_WORK,
      ],
    },
    {
      provide: CreateBookingUseCase,
      useFactory: (
        bookingRepo,
        holdRepo,
        audit,
        outbox,
        idempotency,
        idgen,
        clock,
        uow,
        policies
      ) =>
        new CreateBookingUseCase(
          bookingRepo,
          holdRepo,
          audit,
          outbox,
          idempotency,
          idgen,
          clock,
          uow,
          policies
        ),
      inject: [
        BOOKING_REPOSITORY,
        HOLD_REPOSITORY,
        AUDIT_PORT,
        OUTBOX_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        UNIT_OF_WORK,
        BOOKING_POLICIES,
      ],
    },
    {
      provide: RescheduleBookingUseCase,
      useFactory: (bookingRepo, audit, outbox, idgen, clock, uow, policies) =>
        new RescheduleBookingUseCase(bookingRepo, audit, outbox, idgen, clock, uow, policies),
      inject: [
        BOOKING_REPOSITORY,
        AUDIT_PORT,
        OUTBOX_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        UNIT_OF_WORK,
        BOOKING_POLICIES,
      ],
    },
    {
      provide: CancelBookingUseCase,
      useFactory: (bookingRepo, audit, outbox, uow) =>
        new CancelBookingUseCase(bookingRepo, audit, outbox, uow),
      inject: [BOOKING_REPOSITORY, AUDIT_PORT, OUTBOX_PORT, UNIT_OF_WORK],
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
      useFactory: (ruleRepo, resourceRepo, audit, clock, idgen, uow) =>
        new UpsertAvailabilityRuleUseCase(ruleRepo, resourceRepo, audit, clock, idgen, uow),
      inject: [
        AVAILABILITY_RULE_REPOSITORY,
        RESOURCE_REPOSITORY,
        AUDIT_PORT,
        CLOCK_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        UNIT_OF_WORK,
      ],
    },
    {
      provide: GetAvailabilityUseCase,
      useFactory: (ruleRepo, resourceRepo) => new GetAvailabilityUseCase(ruleRepo, resourceRepo),
      inject: [AVAILABILITY_RULE_REPOSITORY, RESOURCE_REPOSITORY],
    },
  ],
  exports: [OpenBukAppointmentChangeUseCase, BookingSourceAccess],
})
export class BookingModule {}
