import type { CashDashboardResponse } from "@corely/contracts";

export const cashDashboardScenarioIds = ["open", "ready", "closed"] as const;

export type CashDashboardScenarioId = (typeof cashDashboardScenarioIds)[number];

export const cashDashboardSurfaceModes = ["default", "loading", "empty", "warning"] as const;

export type CashDashboardSurfaceMode = (typeof cashDashboardSurfaceModes)[number];

export type CashDashboardDayStatus = "open" | "needs-review" | "ready-to-close" | "closed";

export type CashDashboardExportStatus =
  | "ready"
  | "blocked-receipts"
  | "blocked-open-days"
  | "blocked-review"
  | "exported";

export type CashDashboardEntryType =
  | "income"
  | "expense"
  | "private-deposit"
  | "private-withdrawal";

export interface CashDashboardEntry {
  id: string;
  occurredAt: string;
  type: CashDashboardEntryType;
  amountCents: number;
  note: string;
  hasReceipt: boolean;
  receiptRequired: boolean;
  needsReview: boolean;
  missingNote: boolean;
  canReverse: boolean;
  actionHref: string;
}

export interface CashDashboardData {
  scenarioId: CashDashboardScenarioId;
  registerId: string;
  salonName: string;
  location?: string | null;
  currency: string;
  dayKey: string;
  monthKey: string;
  summary: {
    openingBalanceCents: number;
    cashIncomeTodayCents: number;
    cashExpensesTodayCents: number;
    privateDepositsCents: number;
    privateWithdrawalsCents: number;
    expectedClosingCents: number;
    countedCashCents?: number;
    differenceCents?: number;
  };
  status: {
    dayStatus: CashDashboardDayStatus;
    missingReceiptsToday: number;
    missingReceiptsThisMonth: number;
    receiptsAttachedToday: number;
    reviewItemsCount: number;
    suspiciousEntriesCount: number;
    missingNotesCount: number;
    openDaysThisWeek: number;
    openDaysThisMonth: number;
    receiptCompletionPercent: number;
    exportStatus: CashDashboardExportStatus;
    exportAlreadyGenerated: boolean;
  };
  closing: {
    isClosed: boolean;
    countedCashEntered: boolean;
    lastClosedDate?: string | null;
    lastClosedBy?: string;
    responsiblePerson?: string | null;
  };
  export: {
    lastExportDate?: string;
    monthEntriesCompleted: number;
    monthEntriesTotal: number;
    checklist: {
      daysClosed: boolean;
      receiptsComplete: boolean;
      reviewQueueClear: boolean;
    };
  };
  trend: {
    weekIncomeCents: number;
    weekExpensesCents: number;
    openDaysCount: number;
    missingReceiptsCount: number;
    monthCashTotalCents: number;
    lastMonthCashTotalCents: number;
  };
  recentEntries: CashDashboardEntry[];
}

interface RawCashDashboardScenario {
  id: CashDashboardScenarioId;
  registerId: string;
  salonName: string;
  location: string;
  currency: string;
  dayKey: string;
  monthKey: string;
  openingBalanceCents: number;
  countedCashCents?: number;
  isClosed: boolean;
  lastClosedDate: string;
  lastClosedBy?: string;
  responsiblePerson: string;
  entries: CashDashboardEntry[];
  extraMonthMissingReceipts: number;
  otherOpenDaysThisWeek: number;
  otherOpenDaysThisMonth: number;
  lastExportDate?: string;
  exportAlreadyGenerated: boolean;
  monthEntriesCompleted: number;
  monthEntriesTotal: number;
  weekIncomeCents: number;
  weekExpensesCents: number;
  monthCashTotalCents: number;
  lastMonthCashTotalCents: number;
}

const registerHref = (registerId: string) => `/cash/registers/${registerId}`;
const entriesHref = (registerId: string) => `/cash/registers/${registerId}/entries`;

const rawScenarios: Record<CashDashboardScenarioId, RawCashDashboardScenario> = {
  open: {
    id: "open",
    registerId: "demo-salon-berlin",
    salonName: "Lotus Nails Berlin",
    location: "Berlin-Neukoelln",
    currency: "EUR",
    dayKey: "2026-03-14",
    monthKey: "2026-03",
    openingBalanceCents: 20000,
    isClosed: false,
    lastClosedDate: "2026-03-12",
    lastClosedBy: "Thao Nguyen",
    responsiblePerson: "Lan Tran",
    extraMonthMissingReceipts: 2,
    otherOpenDaysThisWeek: 1,
    otherOpenDaysThisMonth: 2,
    exportAlreadyGenerated: false,
    monthEntriesCompleted: 68,
    monthEntriesTotal: 82,
    weekIncomeCents: 214800,
    weekExpensesCents: 39200,
    monthCashTotalCents: 389400,
    lastMonthCashTotalCents: 421700,
    entries: [
      {
        id: "entry-open-1",
        occurredAt: "2026-03-14T09:10:00+01:00",
        type: "income",
        amountCents: 18600,
        note: "Morning manicure rush",
        hasReceipt: true,
        receiptRequired: false,
        needsReview: false,
        missingNote: false,
        canReverse: true,
        actionHref: entriesHref("demo-salon-berlin"),
      },
      {
        id: "entry-open-2",
        occurredAt: "2026-03-14T11:40:00+01:00",
        type: "expense",
        amountCents: 2800,
        note: "Acetone refill",
        hasReceipt: false,
        receiptRequired: true,
        needsReview: false,
        missingNote: false,
        canReverse: false,
        actionHref: entriesHref("demo-salon-berlin"),
      },
      {
        id: "entry-open-3",
        occurredAt: "2026-03-14T13:15:00+01:00",
        type: "income",
        amountCents: 9900,
        note: "Walk-in pedicure",
        hasReceipt: true,
        receiptRequired: false,
        needsReview: false,
        missingNote: false,
        canReverse: true,
        actionHref: entriesHref("demo-salon-berlin"),
      },
      {
        id: "entry-open-4",
        occurredAt: "2026-03-14T15:05:00+01:00",
        type: "private-deposit",
        amountCents: 5000,
        note: "Owner top-up for change",
        hasReceipt: false,
        receiptRequired: false,
        needsReview: false,
        missingNote: false,
        canReverse: false,
        actionHref: entriesHref("demo-salon-berlin"),
      },
      {
        id: "entry-open-5",
        occurredAt: "2026-03-14T16:20:00+01:00",
        type: "expense",
        amountCents: 1200,
        note: "",
        hasReceipt: false,
        receiptRequired: true,
        needsReview: false,
        missingNote: true,
        canReverse: false,
        actionHref: entriesHref("demo-salon-berlin"),
      },
      {
        id: "entry-open-6",
        occurredAt: "2026-03-14T17:10:00+01:00",
        type: "expense",
        amountCents: 900,
        note: "Coffee for late shift",
        hasReceipt: false,
        receiptRequired: true,
        needsReview: false,
        missingNote: false,
        canReverse: false,
        actionHref: entriesHref("demo-salon-berlin"),
      },
      {
        id: "entry-open-7",
        occurredAt: "2026-03-14T18:10:00+01:00",
        type: "private-withdrawal",
        amountCents: 3000,
        note: "Cash to safe",
        hasReceipt: false,
        receiptRequired: false,
        needsReview: false,
        missingNote: false,
        canReverse: true,
        actionHref: entriesHref("demo-salon-berlin"),
      },
      {
        id: "entry-open-8",
        occurredAt: "2026-03-14T19:05:00+01:00",
        type: "income",
        amountCents: 11200,
        note: "Manual correction from counter sheet",
        hasReceipt: true,
        receiptRequired: false,
        needsReview: true,
        missingNote: false,
        canReverse: true,
        actionHref: entriesHref("demo-salon-berlin"),
      },
    ],
  },
  ready: {
    id: "ready",
    registerId: "demo-salon-hamburg",
    salonName: "Saigon Nails Hamburg",
    location: "Hamburg-Altona",
    currency: "EUR",
    dayKey: "2026-03-14",
    monthKey: "2026-03",
    openingBalanceCents: 22000,
    countedCashCents: 59500,
    isClosed: false,
    lastClosedDate: "2026-03-13",
    lastClosedBy: "Mai Vo",
    responsiblePerson: "Mai Vo",
    extraMonthMissingReceipts: 0,
    otherOpenDaysThisWeek: 0,
    otherOpenDaysThisMonth: 0,
    lastExportDate: "2026-02-28",
    exportAlreadyGenerated: false,
    monthEntriesCompleted: 93,
    monthEntriesTotal: 97,
    weekIncomeCents: 247600,
    weekExpensesCents: 41800,
    monthCashTotalCents: 412100,
    lastMonthCashTotalCents: 398900,
    entries: [
      {
        id: "entry-ready-1",
        occurredAt: "2026-03-14T09:00:00+01:00",
        type: "income",
        amountCents: 18800,
        note: "Morning appointments",
        hasReceipt: true,
        receiptRequired: false,
        needsReview: false,
        missingNote: false,
        canReverse: true,
        actionHref: entriesHref("demo-salon-hamburg"),
      },
      {
        id: "entry-ready-2",
        occurredAt: "2026-03-14T10:45:00+01:00",
        type: "expense",
        amountCents: 3200,
        note: "Gel polish restock",
        hasReceipt: true,
        receiptRequired: true,
        needsReview: false,
        missingNote: false,
        canReverse: false,
        actionHref: entriesHref("demo-salon-hamburg"),
      },
      {
        id: "entry-ready-3",
        occurredAt: "2026-03-14T12:20:00+01:00",
        type: "income",
        amountCents: 12400,
        note: "Lunch walk-ins",
        hasReceipt: true,
        receiptRequired: false,
        needsReview: false,
        missingNote: false,
        canReverse: true,
        actionHref: entriesHref("demo-salon-hamburg"),
      },
      {
        id: "entry-ready-4",
        occurredAt: "2026-03-14T14:10:00+01:00",
        type: "private-deposit",
        amountCents: 5000,
        note: "Change fund top-up",
        hasReceipt: false,
        receiptRequired: false,
        needsReview: false,
        missingNote: false,
        canReverse: false,
        actionHref: entriesHref("demo-salon-hamburg"),
      },
      {
        id: "entry-ready-5",
        occurredAt: "2026-03-14T16:30:00+01:00",
        type: "income",
        amountCents: 10000,
        note: "Evening cash sales",
        hasReceipt: true,
        receiptRequired: false,
        needsReview: false,
        missingNote: false,
        canReverse: true,
        actionHref: entriesHref("demo-salon-hamburg"),
      },
      {
        id: "entry-ready-6",
        occurredAt: "2026-03-14T17:05:00+01:00",
        type: "expense",
        amountCents: 3500,
        note: "Cleaning supplies",
        hasReceipt: true,
        receiptRequired: true,
        needsReview: false,
        missingNote: false,
        canReverse: false,
        actionHref: entriesHref("demo-salon-hamburg"),
      },
      {
        id: "entry-ready-7",
        occurredAt: "2026-03-14T18:15:00+01:00",
        type: "private-withdrawal",
        amountCents: 2000,
        note: "Owner pickup",
        hasReceipt: false,
        receiptRequired: false,
        needsReview: false,
        missingNote: false,
        canReverse: true,
        actionHref: entriesHref("demo-salon-hamburg"),
      },
    ],
  },
  closed: {
    id: "closed",
    registerId: "demo-salon-munich",
    salonName: "Kim Nails Muenchen",
    location: "Muenchen-Sendling",
    currency: "EUR",
    dayKey: "2026-03-14",
    monthKey: "2026-03",
    openingBalanceCents: 18000,
    countedCashCents: 60200,
    isClosed: true,
    lastClosedDate: "2026-03-14",
    lastClosedBy: "Linh Nguyen",
    responsiblePerson: "Linh Nguyen",
    extraMonthMissingReceipts: 0,
    otherOpenDaysThisWeek: 0,
    otherOpenDaysThisMonth: 0,
    lastExportDate: "2026-02-28",
    exportAlreadyGenerated: false,
    monthEntriesCompleted: 124,
    monthEntriesTotal: 124,
    weekIncomeCents: 301200,
    weekExpensesCents: 53300,
    monthCashTotalCents: 438900,
    lastMonthCashTotalCents: 401400,
    entries: [
      {
        id: "entry-closed-1",
        occurredAt: "2026-03-14T09:05:00+01:00",
        type: "income",
        amountCents: 22200,
        note: "Morning appointments",
        hasReceipt: true,
        receiptRequired: false,
        needsReview: false,
        missingNote: false,
        canReverse: true,
        actionHref: entriesHref("demo-salon-munich"),
      },
      {
        id: "entry-closed-2",
        occurredAt: "2026-03-14T11:20:00+01:00",
        type: "expense",
        amountCents: 3900,
        note: "Tip boxes and change bags",
        hasReceipt: true,
        receiptRequired: true,
        needsReview: false,
        missingNote: false,
        canReverse: false,
        actionHref: entriesHref("demo-salon-munich"),
      },
      {
        id: "entry-closed-3",
        occurredAt: "2026-03-14T13:45:00+01:00",
        type: "income",
        amountCents: 16800,
        note: "Lunch walk-ins",
        hasReceipt: true,
        receiptRequired: false,
        needsReview: false,
        missingNote: false,
        canReverse: true,
        actionHref: entriesHref("demo-salon-munich"),
      },
      {
        id: "entry-closed-4",
        occurredAt: "2026-03-14T16:10:00+01:00",
        type: "expense",
        amountCents: 4500,
        note: "UV lamp replacement",
        hasReceipt: true,
        receiptRequired: true,
        needsReview: false,
        missingNote: false,
        canReverse: false,
        actionHref: entriesHref("demo-salon-munich"),
      },
      {
        id: "entry-closed-5",
        occurredAt: "2026-03-14T18:25:00+01:00",
        type: "income",
        amountCents: 14600,
        note: "Late cash services",
        hasReceipt: true,
        receiptRequired: false,
        needsReview: false,
        missingNote: false,
        canReverse: true,
        actionHref: entriesHref("demo-salon-munich"),
      },
      {
        id: "entry-closed-6",
        occurredAt: "2026-03-14T18:50:00+01:00",
        type: "private-withdrawal",
        amountCents: 3000,
        note: "Owner evening pickup",
        hasReceipt: false,
        receiptRequired: false,
        needsReview: false,
        missingNote: false,
        canReverse: true,
        actionHref: entriesHref("demo-salon-munich"),
      },
    ],
  },
};

const reviewThresholdCents = 500;

const sumByType = (entries: CashDashboardEntry[], type: CashDashboardEntryType): number =>
  entries.filter((entry) => entry.type === type).reduce((sum, entry) => sum + entry.amountCents, 0);

const resolveDayStatus = ({
  isClosed,
  countedCashCents,
  differenceCents,
  missingReceiptsToday,
  reviewItemsCount,
  missingNotesCount,
}: {
  isClosed: boolean;
  countedCashCents?: number;
  differenceCents?: number;
  missingReceiptsToday: number;
  reviewItemsCount: number;
  missingNotesCount: number;
}): CashDashboardDayStatus => {
  if (isClosed) {
    return "closed";
  }

  if (
    missingReceiptsToday > 0 ||
    reviewItemsCount > 0 ||
    missingNotesCount > 0 ||
    (typeof differenceCents === "number" && Math.abs(differenceCents) >= reviewThresholdCents)
  ) {
    return "needs-review";
  }

  if (typeof countedCashCents !== "number") {
    return "open";
  }

  return "ready-to-close";
};

export const resolveCashDashboardScenarioId = (value: string | null): CashDashboardScenarioId => {
  if (value && cashDashboardScenarioIds.includes(value as CashDashboardScenarioId)) {
    return value as CashDashboardScenarioId;
  }

  return "open";
};

export const resolveCashDashboardSurfaceMode = (value: string | null): CashDashboardSurfaceMode => {
  if (value && cashDashboardSurfaceModes.includes(value as CashDashboardSurfaceMode)) {
    return value as CashDashboardSurfaceMode;
  }

  return "default";
};

export const getCashDashboardData = (scenarioId: CashDashboardScenarioId): CashDashboardData => {
  const raw = rawScenarios[scenarioId];
  const cashIncomeTodayCents = sumByType(raw.entries, "income");
  const cashExpensesTodayCents = sumByType(raw.entries, "expense");
  const privateDepositsCents = sumByType(raw.entries, "private-deposit");
  const privateWithdrawalsCents = sumByType(raw.entries, "private-withdrawal");
  const expectedClosingCents =
    raw.openingBalanceCents +
    cashIncomeTodayCents -
    cashExpensesTodayCents +
    privateDepositsCents -
    privateWithdrawalsCents;
  const differenceCents =
    typeof raw.countedCashCents === "number"
      ? raw.countedCashCents - expectedClosingCents
      : undefined;
  const missingReceiptsToday = raw.entries.filter(
    (entry) => entry.receiptRequired && !entry.hasReceipt
  ).length;
  const receiptsAttachedToday = raw.entries.filter(
    (entry) => entry.receiptRequired && entry.hasReceipt
  ).length;
  const missingNotesCount = raw.entries.filter((entry) => entry.missingNote).length;
  const suspiciousEntriesCount = raw.entries.filter((entry) => entry.needsReview).length;
  const reviewItemsCount = raw.entries.filter(
    (entry) => entry.needsReview || entry.missingNote
  ).length;
  const totalRequiredReceiptsToday = receiptsAttachedToday + missingReceiptsToday;
  const openDaysThisWeek = raw.otherOpenDaysThisWeek + (raw.isClosed ? 0 : 1);
  const openDaysThisMonth = raw.otherOpenDaysThisMonth + (raw.isClosed ? 0 : 1);
  const missingReceiptsThisMonth = raw.extraMonthMissingReceipts + missingReceiptsToday;
  const exportChecklist = {
    daysClosed: openDaysThisMonth === 0,
    receiptsComplete: missingReceiptsThisMonth === 0,
    reviewQueueClear:
      reviewItemsCount === 0 &&
      (typeof differenceCents !== "number" || Math.abs(differenceCents) < reviewThresholdCents),
  };
  const exportStatus: CashDashboardExportStatus = raw.exportAlreadyGenerated
    ? "exported"
    : !exportChecklist.receiptsComplete
      ? "blocked-receipts"
      : !exportChecklist.daysClosed
        ? "blocked-open-days"
        : !exportChecklist.reviewQueueClear
          ? "blocked-review"
          : "ready";

  return {
    scenarioId: raw.id,
    registerId: raw.registerId,
    salonName: raw.salonName,
    location: raw.location,
    currency: raw.currency,
    dayKey: raw.dayKey,
    monthKey: raw.monthKey,
    summary: {
      openingBalanceCents: raw.openingBalanceCents,
      cashIncomeTodayCents,
      cashExpensesTodayCents,
      privateDepositsCents,
      privateWithdrawalsCents,
      expectedClosingCents,
      countedCashCents: raw.countedCashCents,
      differenceCents,
    },
    status: {
      dayStatus: resolveDayStatus({
        isClosed: raw.isClosed,
        countedCashCents: raw.countedCashCents,
        differenceCents,
        missingReceiptsToday,
        reviewItemsCount,
        missingNotesCount,
      }),
      missingReceiptsToday,
      missingReceiptsThisMonth,
      receiptsAttachedToday,
      reviewItemsCount,
      suspiciousEntriesCount,
      missingNotesCount,
      openDaysThisWeek,
      openDaysThisMonth,
      receiptCompletionPercent:
        totalRequiredReceiptsToday === 0
          ? 100
          : Math.round((receiptsAttachedToday / totalRequiredReceiptsToday) * 100),
      exportStatus,
      exportAlreadyGenerated: raw.exportAlreadyGenerated,
    },
    closing: {
      isClosed: raw.isClosed,
      countedCashEntered: typeof raw.countedCashCents === "number",
      lastClosedDate: raw.lastClosedDate,
      lastClosedBy: raw.lastClosedBy,
      responsiblePerson: raw.responsiblePerson,
    },
    export: {
      lastExportDate: raw.lastExportDate,
      monthEntriesCompleted: raw.monthEntriesCompleted,
      monthEntriesTotal: raw.monthEntriesTotal,
      checklist: exportChecklist,
    },
    trend: {
      weekIncomeCents: raw.weekIncomeCents,
      weekExpensesCents: raw.weekExpensesCents,
      openDaysCount: openDaysThisMonth,
      missingReceiptsCount: missingReceiptsThisMonth,
      monthCashTotalCents: raw.monthCashTotalCents,
      lastMonthCashTotalCents: raw.lastMonthCashTotalCents,
    },
    recentEntries: [...raw.entries].sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1)),
  };
};

export const getCashDashboardRegisterHref = (registerId: string): string =>
  registerHref(registerId);

export const getCashDashboardEntriesHref = (registerId: string): string => entriesHref(registerId);

export const getCashDashboardDayCloseHref = (registerId: string, dayKey: string): string =>
  `/cash/registers/${registerId}/day-close?day=${dayKey}`;

export const getCashDashboardExportHref = (registerId: string): string =>
  `/cash/registers/${registerId}/exports`;

export const mapCashDashboardResponse = (dashboard: CashDashboardResponse): CashDashboardData => ({
  scenarioId:
    dashboard.status.dayStatus === "closed"
      ? "closed"
      : dashboard.status.dayStatus === "ready-to-close"
        ? "ready"
        : "open",
  registerId: dashboard.registerId,
  salonName: dashboard.salonName,
  location: dashboard.location,
  currency: dashboard.currency,
  dayKey: dashboard.dayKey,
  monthKey: dashboard.monthKey,
  summary: {
    openingBalanceCents: dashboard.summary.openingBalanceCents,
    cashIncomeTodayCents: dashboard.summary.cashIncomeTodayCents,
    cashExpensesTodayCents: dashboard.summary.cashExpensesTodayCents,
    privateDepositsCents: dashboard.summary.privateDepositsCents,
    privateWithdrawalsCents: dashboard.summary.privateWithdrawalsCents,
    expectedClosingCents: dashboard.summary.expectedClosingCents,
    countedCashCents: dashboard.summary.countedCashCents ?? undefined,
    differenceCents: dashboard.summary.differenceCents ?? undefined,
  },
  status: {
    dayStatus: dashboard.status.dayStatus,
    missingReceiptsToday: dashboard.status.missingReceiptsToday,
    missingReceiptsThisMonth: dashboard.status.missingReceiptsThisMonth,
    receiptsAttachedToday: dashboard.status.receiptsAttachedToday,
    reviewItemsCount: dashboard.status.reviewItemsCount,
    suspiciousEntriesCount: dashboard.status.suspiciousEntriesCount,
    missingNotesCount: dashboard.status.missingNotesCount,
    openDaysThisWeek: dashboard.status.openDaysThisWeek,
    openDaysThisMonth: dashboard.status.openDaysThisMonth,
    receiptCompletionPercent: dashboard.status.receiptCompletionPercent,
    exportStatus: dashboard.status.exportStatus,
    exportAlreadyGenerated: dashboard.status.exportAlreadyGenerated,
  },
  closing: {
    isClosed: dashboard.closing.isClosed,
    countedCashEntered: dashboard.closing.countedCashEntered,
    lastClosedDate: dashboard.closing.lastClosedDate ?? undefined,
    lastClosedBy: dashboard.closing.lastClosedBy ?? undefined,
    responsiblePerson: dashboard.closing.responsiblePerson ?? undefined,
  },
  export: {
    lastExportDate: dashboard.export.lastExportDate ?? undefined,
    monthEntriesCompleted: dashboard.export.monthEntriesCompleted,
    monthEntriesTotal: dashboard.export.monthEntriesTotal,
    checklist: {
      daysClosed: dashboard.export.checklist.daysClosed,
      receiptsComplete: dashboard.export.checklist.receiptsComplete,
      reviewQueueClear: dashboard.export.checklist.reviewQueueClear,
    },
  },
  trend: {
    weekIncomeCents: dashboard.trend.weekIncomeCents,
    weekExpensesCents: dashboard.trend.weekExpensesCents,
    openDaysCount: dashboard.trend.openDaysCount,
    missingReceiptsCount: dashboard.trend.missingReceiptsCount,
    monthCashTotalCents: dashboard.trend.monthCashTotalCents,
    lastMonthCashTotalCents: dashboard.trend.lastMonthCashTotalCents,
  },
  recentEntries: dashboard.recentEntries.map((entry) => ({
    id: entry.id,
    occurredAt: entry.occurredAt,
    type: entry.type,
    amountCents: entry.amountCents,
    note: entry.note,
    hasReceipt: entry.hasReceipt,
    receiptRequired: entry.receiptRequired,
    needsReview: entry.needsReview,
    missingNote: entry.missingNote,
    canReverse: entry.canReverse,
    actionHref: entriesHref(dashboard.registerId),
  })),
});
