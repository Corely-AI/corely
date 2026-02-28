export const CashEntryDirection = {
  IN: "IN",
  OUT: "OUT",
} as const;
export type CashEntryDirection = (typeof CashEntryDirection)[keyof typeof CashEntryDirection];

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
