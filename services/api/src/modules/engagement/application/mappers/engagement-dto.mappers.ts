import type {
  CheckInEvent,
  CustomerPackage,
  EngagementSettings,
  LoyaltyAccount,
  LoyaltyLedgerEntry,
  PackageUsage,
  UpcomingBirthday,
} from "@corely/contracts";
import type {
  LoyaltyAccountRecord,
  LoyaltyLedgerEntryRecord,
} from "../ports/loyalty-repository.port";
import type { EngagementSettingsRecord } from "../../domain/engagement.types";
import type { CheckInEventRecord as CheckInRecord } from "../ports/checkin-repository.port";
import type { CustomerPackageRecord, PackageUsageRecord } from "../ports/package-repository.port";
import type { BirthdayCustomerRecord } from "../ports/birthday-repository.port";

const toIsoString = (value: Date) => value.toISOString();
const toLocalDate = (value: Date) => value.toISOString().slice(0, 10);

export const toCheckInEventDto = (record: CheckInRecord): CheckInEvent => ({
  tenantId: record.tenantId,
  checkInEventId: record.checkInEventId,
  customerPartyId: record.customerPartyId,
  registerId: record.registerId,
  kioskDeviceId: record.kioskDeviceId ?? null,
  checkedInAt: toIsoString(record.checkedInAt),
  checkedInByType: record.checkedInByType,
  checkedInByEmployeePartyId: record.checkedInByEmployeePartyId ?? null,
  status: record.status,
  visitReason: record.visitReason ?? null,
  assignedEmployeePartyId: record.assignedEmployeePartyId ?? null,
  tags: record.tags ?? [],
  posSaleId: record.posSaleId ?? null,
  notes: record.notes ?? null,
  createdAt: toIsoString(record.createdAt),
  updatedAt: toIsoString(record.updatedAt),
});

export const toLoyaltyAccountDto = (record: LoyaltyAccountRecord): LoyaltyAccount => ({
  tenantId: record.tenantId,
  loyaltyAccountId: record.loyaltyAccountId,
  customerPartyId: record.customerPartyId,
  status: record.status,
  currentPointsBalance: record.currentPointsBalance,
  lifetimeEarnedPoints: record.lifetimeEarnedPoints,
  tier: record.tier ?? null,
  createdAt: toIsoString(record.createdAt),
  updatedAt: toIsoString(record.updatedAt),
});

export const toLoyaltyLedgerEntryDto = (record: LoyaltyLedgerEntryRecord): LoyaltyLedgerEntry => ({
  tenantId: record.tenantId,
  entryId: record.entryId,
  customerPartyId: record.customerPartyId,
  entryType: record.entryType,
  pointsDelta: record.pointsDelta,
  reasonCode: record.reasonCode,
  sourceType: record.sourceType ?? null,
  sourceId: record.sourceId ?? null,
  createdAt: toIsoString(record.createdAt),
  createdByEmployeePartyId: record.createdByEmployeePartyId ?? null,
});

export const toEngagementSettingsDto = (record: EngagementSettingsRecord): EngagementSettings => ({
  tenantId: record.tenantId,
  checkInModeEnabled: record.checkInModeEnabled,
  checkInDuplicateWindowMinutes: record.checkInDuplicateWindowMinutes,
  loyaltyEnabled: record.loyaltyEnabled,
  pointsPerVisit: record.pointsPerVisit,
  rewardRules:
    record.rewardRules?.map((rule) => ({
      rewardId: rule.rewardId,
      label: rule.label,
      pointsCost: rule.pointsCost,
      rewardValueCents: rule.rewardValueCents ?? undefined,
      active: rule.active ?? true,
    })) ?? [],
  aiEnabled: record.aiEnabled,
  kioskBranding: record.kioskBranding ?? null,
  createdAt: toIsoString(record.createdAt),
  updatedAt: toIsoString(record.updatedAt),
});

export const toCustomerPackageDto = (record: CustomerPackageRecord): CustomerPackage => ({
  tenantId: record.tenantId,
  customerPackageId: record.customerPackageId,
  customerPartyId: record.customerPartyId,
  name: record.name,
  totalUnits: record.totalUnits,
  remainingUnits: record.remainingUnits,
  expiresOn: record.expiresOn ? toLocalDate(record.expiresOn) : null,
  status: record.status,
  notes: record.notes ?? null,
  createdAt: toIsoString(record.createdAt),
  updatedAt: toIsoString(record.updatedAt),
});

export const toPackageUsageDto = (record: PackageUsageRecord): PackageUsage => ({
  tenantId: record.tenantId,
  usageId: record.usageId,
  customerPackageId: record.customerPackageId,
  customerPartyId: record.customerPartyId,
  unitsUsed: record.unitsUsed,
  usedAt: toIsoString(record.usedAt),
  sourceType: record.sourceType ?? null,
  sourceId: record.sourceId ?? null,
  notes: record.notes ?? null,
  createdByEmployeePartyId: record.createdByEmployeePartyId ?? null,
});

const nextBirthdayFrom = (birthday: Date, fromDate: Date): Date => {
  const month = birthday.getUTCMonth();
  const day = birthday.getUTCDate();
  const fromYear = fromDate.getUTCFullYear();
  const candidate = new Date(Date.UTC(fromYear, month, day));
  if (candidate < new Date(Date.UTC(fromYear, fromDate.getUTCMonth(), fromDate.getUTCDate()))) {
    return new Date(Date.UTC(fromYear + 1, month, day));
  }
  return candidate;
};

export const toUpcomingBirthdayDto = (
  record: BirthdayCustomerRecord,
  fromDate: Date
): UpcomingBirthday => {
  const nextBirthday = nextBirthdayFrom(record.birthday, fromDate);
  const diffMs =
    nextBirthday.getTime() -
    Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate());
  const daysUntilBirthday = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return {
    customerPartyId: record.customerPartyId,
    displayName: record.displayName,
    birthday: toLocalDate(record.birthday),
    nextBirthday: toLocalDate(nextBirthday),
    daysUntilBirthday,
  };
};
