import { Inject, Injectable } from "@nestjs/common";
import type {
  CashDashboardDayStatus,
  CashDashboardEntryType,
  CashDashboardExportStatus,
  CashDashboardResponse,
  GetCashDashboardQuery,
} from "@corely/contracts";
import {
  BaseUseCase,
  NotFoundError,
  RequireTenant,
  ValidationError,
  ok,
  type Result,
  type UseCaseContext,
  type UseCaseError,
} from "@corely/kernel";
import {
  CASH_ATTACHMENT_REPO,
  CASH_DAY_CLOSE_REPO,
  CASH_ENTRY_REPO,
  CASH_EXPORT_REPO,
  CASH_REGISTER_REPO,
  type CashAttachmentRepoPort,
  type CashDayCloseRepoPort,
  type CashEntryRepoPort,
  type CashExportRepoPort,
  type CashRegisterRepoPort,
} from "../ports/cash-management.ports";
import type { CashDayCloseEntity, CashEntryEntity } from "../../domain/entities";
import { assertCanManageCash } from "../../policies/assert-cash-policies";

const receiptRequiredTypes = new Set<string>([
  "EXPENSE_CASH",
  "REFUND_CASH",
  "BANK_DEPOSIT",
  "BANK_WITHDRAWAL",
  "CORRECTION",
  "CLOSING_ADJUSTMENT",
  "OUT",
]);

const suspiciousEntryTypes = new Set<string>(["CORRECTION", "CLOSING_ADJUSTMENT", "IN", "OUT"]);

const toDayKey = (value?: string): string =>
  value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);
const toMonthKey = (dayKey: string): string => dayKey.slice(0, 7);

const shiftMonth = (monthKey: string, offset: number): string => {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
};

const startOfWeekDayKey = (dayKey: string): string => {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  const day = date.getUTCDay();
  const shift = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + shift);
  return date.toISOString().slice(0, 10);
};

const signedAmount = (entry: CashEntryEntity): number =>
  entry.direction === "OUT" ? -entry.amountCents : entry.amountCents;

const requiresReceipt = (entry: CashEntryEntity): boolean => receiptRequiredTypes.has(entry.type);

const isSuspiciousEntry = (entry: CashEntryEntity): boolean =>
  suspiciousEntryTypes.has(entry.type) || entry.source === "DIFFERENCE";

const isMissingNote = (entry: CashEntryEntity): boolean => entry.description.trim().length === 0;

const isSubmittedClose = (close: CashDayCloseEntity | null | undefined): boolean =>
  close?.status === "SUBMITTED";

const mapEntryType = (entry: CashEntryEntity): CashDashboardEntryType => {
  if (entry.type === "OWNER_DEPOSIT") {
    return "private-deposit";
  }
  if (entry.type === "OWNER_WITHDRAWAL") {
    return "private-withdrawal";
  }
  if (entry.direction === "OUT") {
    return "expense";
  }
  return "income";
};

@RequireTenant()
@Injectable()
export class GetCashDashboardQueryUseCase extends BaseUseCase<
  GetCashDashboardQuery,
  { dashboard: CashDashboardResponse }
> {
  constructor(
    @Inject(CASH_REGISTER_REPO)
    private readonly registerRepo: CashRegisterRepoPort,
    @Inject(CASH_ENTRY_REPO)
    private readonly entryRepo: CashEntryRepoPort,
    @Inject(CASH_DAY_CLOSE_REPO)
    private readonly dayCloseRepo: CashDayCloseRepoPort,
    @Inject(CASH_ATTACHMENT_REPO)
    private readonly attachmentRepo: CashAttachmentRepoPort,
    @Inject(CASH_EXPORT_REPO)
    private readonly exportRepo: CashExportRepoPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: GetCashDashboardQuery,
    ctx: UseCaseContext
  ): Promise<Result<{ dashboard: CashDashboardResponse }, UseCaseError>> {
    assertCanManageCash(ctx, input.registerId);

    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    const register = await this.registerRepo.findRegisterById(
      tenantId,
      workspaceId,
      input.registerId
    );
    if (!register) {
      throw new NotFoundError(
        "Cash register not found",
        undefined,
        "CashManagement:RegisterNotFound"
      );
    }

    const dayKey = toDayKey(input.dayKey);
    const monthKey = toMonthKey(dayKey);
    const previousMonthKey = shiftMonth(monthKey, -1);
    const weekStart = startOfWeekDayKey(dayKey);

    const [
      todayEntries,
      monthEntries,
      previousMonthEntries,
      todayClose,
      monthCloses,
      allCloses,
      monthAttachments,
      latestMonthArtifact,
    ] = await Promise.all([
      this.entryRepo.listEntries(tenantId, workspaceId, {
        registerId: register.id,
        dayKeyFrom: dayKey,
        dayKeyTo: dayKey,
      }),
      this.entryRepo.listEntriesForMonth(tenantId, workspaceId, register.id, monthKey),
      this.entryRepo.listEntriesForMonth(tenantId, workspaceId, register.id, previousMonthKey),
      this.dayCloseRepo.findDayCloseByRegisterAndDay(tenantId, workspaceId, register.id, dayKey),
      this.dayCloseRepo.listDayClosesForMonth(tenantId, workspaceId, register.id, monthKey),
      this.dayCloseRepo.listDayCloses(tenantId, workspaceId, { registerId: register.id }),
      this.attachmentRepo.listAttachmentsForMonth(tenantId, workspaceId, register.id, monthKey),
      this.exportRepo.findLatestArtifact(tenantId, workspaceId, register.id, monthKey),
    ]);

    const attachmentEntryIds = new Set(monthAttachments.map((attachment) => attachment.entryId));
    const todayEntriesAsc = todayEntries
      .slice()
      .sort(
        (left, right) =>
          left.occurredAt.getTime() - right.occurredAt.getTime() || left.entryNo - right.entryNo
      );
    const todayAttachmentCount = todayEntries.filter(
      (entry) => requiresReceipt(entry) && attachmentEntryIds.has(entry.id)
    ).length;

    const cashIncomeTodayCents = todayEntries
      .filter((entry) => mapEntryType(entry) === "income")
      .reduce((sum, entry) => sum + entry.amountCents, 0);
    const cashExpensesTodayCents = todayEntries
      .filter((entry) => mapEntryType(entry) === "expense")
      .reduce((sum, entry) => sum + entry.amountCents, 0);
    const privateDepositsCents = todayEntries
      .filter((entry) => mapEntryType(entry) === "private-deposit")
      .reduce((sum, entry) => sum + entry.amountCents, 0);
    const privateWithdrawalsCents = todayEntries
      .filter((entry) => mapEntryType(entry) === "private-withdrawal")
      .reduce((sum, entry) => sum + entry.amountCents, 0);

    const earliestTodayEntry = todayEntriesAsc[0];
    const openingBalanceCents = earliestTodayEntry
      ? earliestTodayEntry.balanceAfterCents - signedAmount(earliestTodayEntry)
      : register.currentBalanceCents;

    const expectedClosingCents =
      openingBalanceCents +
      cashIncomeTodayCents -
      cashExpensesTodayCents +
      privateDepositsCents -
      privateWithdrawalsCents;

    const missingReceiptsToday = todayEntries.filter(
      (entry) => requiresReceipt(entry) && !attachmentEntryIds.has(entry.id)
    );
    const missingReceiptEntriesMonth = monthEntries.filter(
      (entry) => requiresReceipt(entry) && !attachmentEntryIds.has(entry.id)
    );
    const suspiciousEntriesToday = todayEntries.filter(isSuspiciousEntry);
    const suspiciousEntriesMonth = monthEntries.filter(isSuspiciousEntry);
    const missingNotesToday = todayEntries.filter(isMissingNote);
    const reviewItemsCount = suspiciousEntriesToday.length + missingNotesToday.length;
    const countedCashCents = todayClose?.countedBalanceCents ?? null;
    const differenceCents = todayClose?.differenceCents ?? null;

    const blockers: string[] = [];
    if (missingReceiptsToday.length > 0) {
      blockers.push("missing-receipts");
    }
    if (countedCashCents === null) {
      blockers.push("missing-count");
    }
    if (differenceCents !== null && differenceCents !== 0 && !todayClose?.note) {
      blockers.push("missing-difference-note");
    }
    if (reviewItemsCount > 0) {
      blockers.push("review-items");
    }

    let dayStatus: CashDashboardDayStatus = "open";
    if (isSubmittedClose(todayClose)) {
      dayStatus = "closed";
    } else if (blockers.length > 0) {
      dayStatus = "needs-review";
    } else if (countedCashCents !== null) {
      dayStatus = "ready-to-close";
    }

    const submittedDayKeys = new Set(
      monthCloses.filter(isSubmittedClose).map((close) => close.dayKey)
    );
    const weekEntries = [...previousMonthEntries, ...monthEntries].filter(
      (entry) => entry.dayKey >= weekStart && entry.dayKey <= dayKey
    );
    const weekSubmittedDayKeys = new Set(
      allCloses.filter(isSubmittedClose).map((close) => close.dayKey)
    );
    const daysWithEntries = new Set(monthEntries.map((entry) => entry.dayKey));
    const weekOpenDays = new Set(
      weekEntries
        .map((entry) => entry.dayKey)
        .filter((entryDayKey) => !weekSubmittedDayKeys.has(entryDayKey))
    );
    const openMonthDays = new Set<string>();

    for (const day of daysWithEntries) {
      if (submittedDayKeys.has(day)) {
        continue;
      }
      openMonthDays.add(day);
    }

    const totalRequiredReceiptsToday = todayEntries.filter(requiresReceipt).length;
    const receiptCompletionPercent =
      totalRequiredReceiptsToday === 0
        ? 100
        : Math.round((todayAttachmentCount / totalRequiredReceiptsToday) * 100);

    const reviewEntryIds = new Set(
      [...suspiciousEntriesMonth, ...monthEntries.filter(isMissingNote)].map((entry) => entry.id)
    );
    const missingReceiptEntryIds = new Set(missingReceiptEntriesMonth.map((entry) => entry.id));
    const monthEntriesCompleted = monthEntries.filter(
      (entry) => !reviewEntryIds.has(entry.id) && !missingReceiptEntryIds.has(entry.id)
    ).length;

    const exportChecklist = {
      daysClosed: openMonthDays.size === 0,
      receiptsComplete: missingReceiptEntriesMonth.length === 0,
      reviewQueueClear: reviewEntryIds.size === 0,
    };

    const exportStatus: CashDashboardExportStatus = latestMonthArtifact
      ? "exported"
      : !exportChecklist.receiptsComplete
        ? "blocked-receipts"
        : !exportChecklist.daysClosed
          ? "blocked-open-days"
          : !exportChecklist.reviewQueueClear
            ? "blocked-review"
            : "ready";

    const latestSubmittedClose = allCloses.find(isSubmittedClose) ?? null;
    const recentEntriesSource = (todayEntries.length > 0 ? todayEntries : monthEntries)
      .slice()
      .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());

    const weekIncomeCents = weekEntries
      .filter((entry) => mapEntryType(entry) === "income")
      .reduce((sum, entry) => sum + entry.amountCents, 0);
    const weekExpensesCents = weekEntries
      .filter((entry) => mapEntryType(entry) === "expense")
      .reduce((sum, entry) => sum + entry.amountCents, 0);

    const monthCashTotalCents = monthEntries.reduce((sum, entry) => sum + signedAmount(entry), 0);
    const lastMonthCashTotalCents = previousMonthEntries.reduce(
      (sum, entry) => sum + signedAmount(entry),
      0
    );

    return ok({
      dashboard: {
        registerId: register.id,
        salonName: register.name,
        location: register.location,
        currency: register.currency,
        dayKey,
        monthKey,
        summary: {
          openingBalanceCents,
          cashIncomeTodayCents,
          cashExpensesTodayCents,
          privateDepositsCents,
          privateWithdrawalsCents,
          expectedClosingCents,
          countedCashCents,
          differenceCents,
        },
        status: {
          dayStatus,
          missingReceiptsToday: missingReceiptsToday.length,
          missingReceiptsThisMonth: missingReceiptEntriesMonth.length,
          receiptsAttachedToday: todayAttachmentCount,
          reviewItemsCount,
          suspiciousEntriesCount: suspiciousEntriesToday.length,
          missingNotesCount: missingNotesToday.length,
          openDaysThisWeek: weekOpenDays.size,
          openDaysThisMonth: openMonthDays.size,
          receiptCompletionPercent,
          exportStatus,
          exportAlreadyGenerated: Boolean(latestMonthArtifact),
        },
        closing: {
          isClosed: dayStatus === "closed",
          countedCashEntered: countedCashCents !== null,
          lastClosedDate: latestSubmittedClose?.dayKey ?? null,
          lastClosedBy: latestSubmittedClose?.submittedByUserId ?? null,
          responsiblePerson: null,
        },
        export: {
          lastExportDate: latestMonthArtifact?.createdAt.toISOString() ?? null,
          monthEntriesCompleted,
          monthEntriesTotal: monthEntries.length,
          checklist: exportChecklist,
        },
        trend: {
          weekIncomeCents,
          weekExpensesCents,
          openDaysCount: openMonthDays.size,
          missingReceiptsCount: missingReceiptEntriesMonth.length,
          monthCashTotalCents,
          lastMonthCashTotalCents,
        },
        recentEntries: recentEntriesSource.slice(0, 8).map((entry) => ({
          id: entry.id,
          occurredAt: entry.occurredAt.toISOString(),
          type: mapEntryType(entry),
          amountCents: entry.amountCents,
          note: entry.description,
          hasReceipt: attachmentEntryIds.has(entry.id),
          receiptRequired: requiresReceipt(entry),
          needsReview: isSuspiciousEntry(entry),
          missingNote: isMissingNote(entry),
          canReverse:
            !entry.lockedByDayCloseId && !entry.reversalOfEntryId && !entry.reversedByEntryId,
        })),
      },
    });
  }
}
