import type {
  ClassBillingMonthStrategy,
  ClassSessionStatus,
} from "../../domain/entities/classes.entities";

export const PREPAID_LOCK_MESSAGE =
  "Month is billed. Schedule changes are locked, but you can still mark done and take attendance.";

export const ARREARS_LOCK_MESSAGE =
  "Month is billed. Attendance/billing-impacting changes are locked.";

export const monthLockedDetail = (strategy: ClassBillingMonthStrategy) =>
  strategy === "PREPAID_CURRENT_MONTH" ? PREPAID_LOCK_MESSAGE : ARREARS_LOCK_MESSAGE;

export const isScheduledStatusIncluded = (status: ClassSessionStatus) =>
  status === "PLANNED" || status === "DONE";

export const isDoneStatus = (status: ClassSessionStatus) => status === "DONE";
