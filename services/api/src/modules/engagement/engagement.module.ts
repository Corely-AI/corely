import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import {
  AUDIT_PORT,
  IDEMPOTENCY_PORT,
  OUTBOX_PORT,
  type AuditPort,
  type IdempotencyPort,
  type OutboxPort,
} from "@corely/kernel";
import { IdentityModule } from "../identity";
import { EngagementController } from "./adapters/http/engagement.controller";
import { PrismaCheckInRepositoryAdapter } from "./infrastructure/adapters/prisma-checkin-repository.adapter";
import { PrismaLoyaltyRepositoryAdapter } from "./infrastructure/adapters/prisma-loyalty-repository.adapter";
import { PrismaEngagementSettingsRepositoryAdapter } from "./infrastructure/adapters/prisma-engagement-settings-repository.adapter";
import { PrismaPackageRepositoryAdapter } from "./infrastructure/adapters/prisma-package-repository.adapter";
import { PrismaBirthdayRepositoryAdapter } from "./infrastructure/adapters/prisma-birthday-repository.adapter";
import { CHECKIN_REPOSITORY_PORT } from "./application/ports/checkin-repository.port";
import { LOYALTY_REPOSITORY_PORT } from "./application/ports/loyalty-repository.port";
import { ENGAGEMENT_SETTINGS_REPOSITORY_PORT } from "./application/ports/engagement-settings-repository.port";
import { PACKAGE_REPOSITORY_PORT } from "./application/ports/package-repository.port";
import { BIRTHDAY_REPOSITORY_PORT } from "./application/ports/birthday-repository.port";
import { CreateCheckInEventUseCase } from "./application/use-cases/create-checkin.usecase";
import { ListCheckInEventsUseCase } from "./application/use-cases/list-checkins.usecase";
import { CancelCheckInEventUseCase } from "./application/use-cases/cancel-checkin.usecase";
import { CompleteCheckInEventUseCase } from "./application/use-cases/complete-checkin.usecase";
import { GetLoyaltySummaryUseCase } from "./application/use-cases/get-loyalty-summary.usecase";
import { ListLoyaltyLedgerUseCase } from "./application/use-cases/list-loyalty-ledger.usecase";
import { CreateLoyaltyEarnEntryUseCase } from "./application/use-cases/create-loyalty-earn.usecase";
import { CreateLoyaltyAdjustEntryUseCase } from "./application/use-cases/create-loyalty-adjust.usecase";
import { CreateLoyaltyRedeemEntryUseCase } from "./application/use-cases/create-loyalty-redeem.usecase";
import { GetEngagementSettingsUseCase } from "./application/use-cases/get-engagement-settings.usecase";
import { UpdateEngagementSettingsUseCase } from "./application/use-cases/update-engagement-settings.usecase";
import { CreateCustomerPackageUseCase } from "./application/use-cases/create-customer-package.usecase";
import { ListCustomerPackagesUseCase } from "./application/use-cases/list-customer-packages.usecase";
import { ConsumeCustomerPackageUseCase } from "./application/use-cases/consume-customer-package.usecase";
import { ListPackageUsageUseCase } from "./application/use-cases/list-package-usage.usecase";
import { ListUpcomingBirthdaysUseCase } from "./application/use-cases/list-upcoming-birthdays.usecase";
import { EngagementApplication } from "./application/engagement.application";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";

@Module({
  imports: [DataModule, IdentityModule],
  controllers: [EngagementController],
  providers: [
    PrismaCheckInRepositoryAdapter,
    PrismaLoyaltyRepositoryAdapter,
    PrismaEngagementSettingsRepositoryAdapter,
    PrismaPackageRepositoryAdapter,
    PrismaBirthdayRepositoryAdapter,
    NestLoggerAdapter,

    { provide: CHECKIN_REPOSITORY_PORT, useExisting: PrismaCheckInRepositoryAdapter },
    { provide: LOYALTY_REPOSITORY_PORT, useExisting: PrismaLoyaltyRepositoryAdapter },
    {
      provide: ENGAGEMENT_SETTINGS_REPOSITORY_PORT,
      useExisting: PrismaEngagementSettingsRepositoryAdapter,
    },
    { provide: PACKAGE_REPOSITORY_PORT, useExisting: PrismaPackageRepositoryAdapter },
    { provide: BIRTHDAY_REPOSITORY_PORT, useExisting: PrismaBirthdayRepositoryAdapter },

    {
      provide: CreateCheckInEventUseCase,
      useFactory: (
        checkins: PrismaCheckInRepositoryAdapter,
        loyalty: PrismaLoyaltyRepositoryAdapter,
        settings: PrismaEngagementSettingsRepositoryAdapter,
        logger: NestLoggerAdapter
      ) =>
        new CreateCheckInEventUseCase({
          checkins,
          loyalty,
          settings,
          logger,
        }),
      inject: [
        PrismaCheckInRepositoryAdapter,
        PrismaLoyaltyRepositoryAdapter,
        PrismaEngagementSettingsRepositoryAdapter,
        NestLoggerAdapter,
      ],
    },
    {
      provide: ListCheckInEventsUseCase,
      useFactory: (checkins: PrismaCheckInRepositoryAdapter, logger: NestLoggerAdapter) =>
        new ListCheckInEventsUseCase({ checkins, logger }),
      inject: [PrismaCheckInRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: CancelCheckInEventUseCase,
      useFactory: (checkins: PrismaCheckInRepositoryAdapter, logger: NestLoggerAdapter) =>
        new CancelCheckInEventUseCase({ checkins, logger }),
      inject: [PrismaCheckInRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: CompleteCheckInEventUseCase,
      useFactory: (checkins: PrismaCheckInRepositoryAdapter, logger: NestLoggerAdapter) =>
        new CompleteCheckInEventUseCase({ checkins, logger }),
      inject: [PrismaCheckInRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: GetLoyaltySummaryUseCase,
      useFactory: (loyalty: PrismaLoyaltyRepositoryAdapter, logger: NestLoggerAdapter) =>
        new GetLoyaltySummaryUseCase({ loyalty, logger }),
      inject: [PrismaLoyaltyRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: ListLoyaltyLedgerUseCase,
      useFactory: (loyalty: PrismaLoyaltyRepositoryAdapter, logger: NestLoggerAdapter) =>
        new ListLoyaltyLedgerUseCase({ loyalty, logger }),
      inject: [PrismaLoyaltyRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: CreateLoyaltyEarnEntryUseCase,
      useFactory: (
        loyalty: PrismaLoyaltyRepositoryAdapter,
        logger: NestLoggerAdapter,
        idempotency: IdempotencyPort,
        audit: AuditPort,
        outbox: OutboxPort
      ) => new CreateLoyaltyEarnEntryUseCase({ loyalty, logger, idempotency, audit, outbox }),
      inject: [
        PrismaLoyaltyRepositoryAdapter,
        NestLoggerAdapter,
        IDEMPOTENCY_PORT,
        AUDIT_PORT,
        OUTBOX_PORT,
      ],
    },
    {
      provide: CreateLoyaltyAdjustEntryUseCase,
      useFactory: (
        loyalty: PrismaLoyaltyRepositoryAdapter,
        logger: NestLoggerAdapter,
        idempotency: IdempotencyPort,
        audit: AuditPort,
        outbox: OutboxPort
      ) => new CreateLoyaltyAdjustEntryUseCase({ loyalty, logger, idempotency, audit, outbox }),
      inject: [
        PrismaLoyaltyRepositoryAdapter,
        NestLoggerAdapter,
        IDEMPOTENCY_PORT,
        AUDIT_PORT,
        OUTBOX_PORT,
      ],
    },
    {
      provide: CreateLoyaltyRedeemEntryUseCase,
      useFactory: (
        loyalty: PrismaLoyaltyRepositoryAdapter,
        logger: NestLoggerAdapter,
        idempotency: IdempotencyPort,
        audit: AuditPort,
        outbox: OutboxPort
      ) => new CreateLoyaltyRedeemEntryUseCase({ loyalty, logger, idempotency, audit, outbox }),
      inject: [
        PrismaLoyaltyRepositoryAdapter,
        NestLoggerAdapter,
        IDEMPOTENCY_PORT,
        AUDIT_PORT,
        OUTBOX_PORT,
      ],
    },
    {
      provide: GetEngagementSettingsUseCase,
      useFactory: (
        settings: PrismaEngagementSettingsRepositoryAdapter,
        logger: NestLoggerAdapter
      ) => new GetEngagementSettingsUseCase({ settings, logger }),
      inject: [PrismaEngagementSettingsRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: UpdateEngagementSettingsUseCase,
      useFactory: (
        settings: PrismaEngagementSettingsRepositoryAdapter,
        logger: NestLoggerAdapter
      ) => new UpdateEngagementSettingsUseCase({ settings, logger }),
      inject: [PrismaEngagementSettingsRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: CreateCustomerPackageUseCase,
      useFactory: (
        packages: PrismaPackageRepositoryAdapter,
        logger: NestLoggerAdapter,
        idempotency: IdempotencyPort,
        audit: AuditPort,
        outbox: OutboxPort
      ) => new CreateCustomerPackageUseCase({ packages, logger, idempotency, audit, outbox }),
      inject: [
        PrismaPackageRepositoryAdapter,
        NestLoggerAdapter,
        IDEMPOTENCY_PORT,
        AUDIT_PORT,
        OUTBOX_PORT,
      ],
    },
    {
      provide: ListCustomerPackagesUseCase,
      useFactory: (packages: PrismaPackageRepositoryAdapter, logger: NestLoggerAdapter) =>
        new ListCustomerPackagesUseCase({ packages, logger }),
      inject: [PrismaPackageRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: ConsumeCustomerPackageUseCase,
      useFactory: (
        packages: PrismaPackageRepositoryAdapter,
        logger: NestLoggerAdapter,
        idempotency: IdempotencyPort,
        audit: AuditPort,
        outbox: OutboxPort
      ) => new ConsumeCustomerPackageUseCase({ packages, logger, idempotency, audit, outbox }),
      inject: [
        PrismaPackageRepositoryAdapter,
        NestLoggerAdapter,
        IDEMPOTENCY_PORT,
        AUDIT_PORT,
        OUTBOX_PORT,
      ],
    },
    {
      provide: ListPackageUsageUseCase,
      useFactory: (packages: PrismaPackageRepositoryAdapter, logger: NestLoggerAdapter) =>
        new ListPackageUsageUseCase({ packages, logger }),
      inject: [PrismaPackageRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: ListUpcomingBirthdaysUseCase,
      useFactory: (birthdays: PrismaBirthdayRepositoryAdapter, logger: NestLoggerAdapter) =>
        new ListUpcomingBirthdaysUseCase({ birthdays, logger }),
      inject: [PrismaBirthdayRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: EngagementApplication,
      useFactory: (
        createCheckIn: CreateCheckInEventUseCase,
        listCheckIns: ListCheckInEventsUseCase,
        cancelCheckIn: CancelCheckInEventUseCase,
        completeCheckIn: CompleteCheckInEventUseCase,
        getLoyaltySummary: GetLoyaltySummaryUseCase,
        listLoyaltyLedger: ListLoyaltyLedgerUseCase,
        createLoyaltyEarn: CreateLoyaltyEarnEntryUseCase,
        createLoyaltyAdjust: CreateLoyaltyAdjustEntryUseCase,
        createLoyaltyRedeem: CreateLoyaltyRedeemEntryUseCase,
        createCustomerPackage: CreateCustomerPackageUseCase,
        listCustomerPackages: ListCustomerPackagesUseCase,
        consumeCustomerPackage: ConsumeCustomerPackageUseCase,
        listPackageUsage: ListPackageUsageUseCase,
        listUpcomingBirthdays: ListUpcomingBirthdaysUseCase,
        getSettings: GetEngagementSettingsUseCase,
        updateSettings: UpdateEngagementSettingsUseCase
      ) =>
        new EngagementApplication(
          createCheckIn,
          listCheckIns,
          cancelCheckIn,
          completeCheckIn,
          getLoyaltySummary,
          listLoyaltyLedger,
          createLoyaltyEarn,
          createLoyaltyAdjust,
          createLoyaltyRedeem,
          createCustomerPackage,
          listCustomerPackages,
          consumeCustomerPackage,
          listPackageUsage,
          listUpcomingBirthdays,
          getSettings,
          updateSettings
        ),
      inject: [
        CreateCheckInEventUseCase,
        ListCheckInEventsUseCase,
        CancelCheckInEventUseCase,
        CompleteCheckInEventUseCase,
        GetLoyaltySummaryUseCase,
        ListLoyaltyLedgerUseCase,
        CreateLoyaltyEarnEntryUseCase,
        CreateLoyaltyAdjustEntryUseCase,
        CreateLoyaltyRedeemEntryUseCase,
        CreateCustomerPackageUseCase,
        ListCustomerPackagesUseCase,
        ConsumeCustomerPackageUseCase,
        ListPackageUsageUseCase,
        ListUpcomingBirthdaysUseCase,
        GetEngagementSettingsUseCase,
        UpdateEngagementSettingsUseCase,
      ],
    },
  ],
  exports: [EngagementApplication],
})
export class EngagementModule {}
