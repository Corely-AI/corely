export const CashEntryType = {
  IN: "IN",
  OUT: "OUT",
} as const;
export type CashEntryType = (typeof CashEntryType)[keyof typeof CashEntryType];

export const CashEntrySourceType = {
  MANUAL: "MANUAL",
  SALES: "SALES",
  EXPENSE: "EXPENSE",
  DIFFERENCE: "DIFFERENCE", // For daily close differences
} as const;
export type CashEntrySourceType = (typeof CashEntrySourceType)[keyof typeof CashEntrySourceType];

export const DailyCloseStatus = {
  OPEN: "OPEN",
  SUBMITTED: "SUBMITTED",
  LOCKED: "LOCKED",
} as const;
export type DailyCloseStatus = (typeof DailyCloseStatus)[keyof typeof DailyCloseStatus];
