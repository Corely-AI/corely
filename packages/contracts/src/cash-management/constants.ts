export const CashEntryDirection = {
  IN: "IN",
  OUT: "OUT",
} as const;
export type CashEntryDirection = (typeof CashEntryDirection)[keyof typeof CashEntryDirection];

export const CashManagementProductKey = "cash-management";
export type CashManagementProductKey = typeof CashManagementProductKey;

export const CashManagementBillingFeatureKeys = {
  maxLocations: "cash-management.maxLocations",
  maxEntriesPerMonth: "cash-management.maxEntriesPerMonth",
  maxReceiptsPerMonth: "cash-management.maxReceiptsPerMonth",
  canExport: "cash-management.canExport",
  dailyClosing: "cash-management.dailyClosing",
  aiAssistant: "cash-management.aiAssistant",
  multilingualAiHelp: "cash-management.multilingualAiHelp",
  issueDetection: "cash-management.issueDetection",
  closingGuidance: "cash-management.closingGuidance",
  teamAccess: "cash-management.teamAccess",
  consolidatedOverview: "cash-management.consolidatedOverview",
} as const;
export type CashManagementBillingFeatureKey =
  (typeof CashManagementBillingFeatureKeys)[keyof typeof CashManagementBillingFeatureKeys];

export const CashManagementBillingMetricKeys = {
  entries: "cash.entries",
  receipts: "cash.receipts",
  locations: "cash.locations",
} as const;
export type CashManagementBillingMetricKey =
  (typeof CashManagementBillingMetricKeys)[keyof typeof CashManagementBillingMetricKeys];

export const CashEntrySource = {
  MANUAL: "MANUAL",
  SALES: "SALES",
  EXPENSE: "EXPENSE",
  DIFFERENCE: "DIFFERENCE",
  IMPORT: "IMPORT",
  INTEGRATION: "INTEGRATION",
} as const;
export type KnownCashEntrySource = (typeof CashEntrySource)[keyof typeof CashEntrySource];
export type CashEntrySource = KnownCashEntrySource | (string & {});

export const CashEntryType = {
  SALE_CASH: "SALE_CASH",
  REFUND_CASH: "REFUND_CASH",
  EXPENSE_CASH: "EXPENSE_CASH",
  OWNER_DEPOSIT: "OWNER_DEPOSIT",
  OWNER_WITHDRAWAL: "OWNER_WITHDRAWAL",
  BANK_DEPOSIT: "BANK_DEPOSIT",
  BANK_WITHDRAWAL: "BANK_WITHDRAWAL",
  CORRECTION: "CORRECTION",
  OPENING_FLOAT: "OPENING_FLOAT",
  CLOSING_ADJUSTMENT: "CLOSING_ADJUSTMENT",
  IN: "IN", // Legacy compatibility
  OUT: "OUT", // Legacy compatibility
} as const;
export type CashEntryType = (typeof CashEntryType)[keyof typeof CashEntryType];

export const CashPaymentMethod = {
  CASH: "CASH",
  CARD: "CARD",
  TRANSFER: "TRANSFER",
  OTHER: "OTHER",
} as const;
export type CashPaymentMethod =
  | (typeof CashPaymentMethod)[keyof typeof CashPaymentMethod]
  | (string & {});

// Compatibility alias for cash-management callers.
export const PaymentMethod = CashPaymentMethod;
export type PaymentMethod = CashPaymentMethod;

export const CashDayCloseStatus = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  VOIDED: "VOIDED",
} as const;
export type CashDayCloseStatus =
  | (typeof CashDayCloseStatus)[keyof typeof CashDayCloseStatus]
  | "OPEN"
  | "LOCKED";

// Legacy aliases kept to avoid breaking existing callers while migrating.
export const CashEntrySourceType = CashEntrySource;
export type CashEntrySourceType = KnownCashEntrySource;

export const DailyCloseStatus = {
  ...CashDayCloseStatus,
  OPEN: "OPEN",
  LOCKED: "LOCKED",
} as const;
export type DailyCloseStatus = (typeof DailyCloseStatus)[keyof typeof DailyCloseStatus];
