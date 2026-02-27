import type { CreateCheckInEventUseCase } from "./use-cases/create-checkin.usecase";
import type { ListCheckInEventsUseCase } from "./use-cases/list-checkins.usecase";
import type { CancelCheckInEventUseCase } from "./use-cases/cancel-checkin.usecase";
import type { CompleteCheckInEventUseCase } from "./use-cases/complete-checkin.usecase";
import type { GetLoyaltySummaryUseCase } from "./use-cases/get-loyalty-summary.usecase";
import type { ListLoyaltyLedgerUseCase } from "./use-cases/list-loyalty-ledger.usecase";
import type { CreateLoyaltyEarnEntryUseCase } from "./use-cases/create-loyalty-earn.usecase";
import type { CreateLoyaltyAdjustEntryUseCase } from "./use-cases/create-loyalty-adjust.usecase";
import type { CreateLoyaltyRedeemEntryUseCase } from "./use-cases/create-loyalty-redeem.usecase";
import type { GetEngagementSettingsUseCase } from "./use-cases/get-engagement-settings.usecase";
import type { UpdateEngagementSettingsUseCase } from "./use-cases/update-engagement-settings.usecase";
import type { CreateCustomerPackageUseCase } from "./use-cases/create-customer-package.usecase";
import type { ListCustomerPackagesUseCase } from "./use-cases/list-customer-packages.usecase";
import type { ConsumeCustomerPackageUseCase } from "./use-cases/consume-customer-package.usecase";
import type { ListPackageUsageUseCase } from "./use-cases/list-package-usage.usecase";
import type { ListUpcomingBirthdaysUseCase } from "./use-cases/list-upcoming-birthdays.usecase";

export class EngagementApplication {
  constructor(
    public readonly createCheckIn: CreateCheckInEventUseCase,
    public readonly listCheckIns: ListCheckInEventsUseCase,
    public readonly cancelCheckIn: CancelCheckInEventUseCase,
    public readonly completeCheckIn: CompleteCheckInEventUseCase,
    public readonly getLoyaltySummary: GetLoyaltySummaryUseCase,
    public readonly listLoyaltyLedger: ListLoyaltyLedgerUseCase,
    public readonly createLoyaltyEarn: CreateLoyaltyEarnEntryUseCase,
    public readonly createLoyaltyAdjust: CreateLoyaltyAdjustEntryUseCase,
    public readonly createLoyaltyRedeem: CreateLoyaltyRedeemEntryUseCase,
    public readonly createCustomerPackage: CreateCustomerPackageUseCase,
    public readonly listCustomerPackages: ListCustomerPackagesUseCase,
    public readonly consumeCustomerPackage: ConsumeCustomerPackageUseCase,
    public readonly listPackageUsage: ListPackageUsageUseCase,
    public readonly listUpcomingBirthdays: ListUpcomingBirthdaysUseCase,
    public readonly getSettings: GetEngagementSettingsUseCase,
    public readonly updateSettings: UpdateEngagementSettingsUseCase
  ) {}
}
