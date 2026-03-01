import type { VatPeriodStatus, VatPeriodSummaryDto } from "@corely/contracts";

export const FINAL_STATUSES: readonly VatPeriodStatus[] = ["SUBMITTED", "PAID", "NIL", "ARCHIVED"];

export type VatPeriodStatusVariant = "overdue" | "success" | "muted" | "outline";

export function formatPeriodLabel(period: VatPeriodSummaryDto): string {
  const start = new Date(period.periodStart);
  const quarter = Math.floor(start.getUTCMonth() / 3) + 1;
  return `Q${quarter} ${start.getUTCFullYear()}`;
}

export function formatDateRange(start: string, end: string): string {
  return `${formatIsoDate(start)} to ${formatIsoDate(end)}`;
}

export function formatIsoDate(value: string): string {
  return new Date(value).toISOString().split("T")[0];
}

export function statusVariant(status: VatPeriodStatus): VatPeriodStatusVariant {
  switch (status) {
    case "OVERDUE":
      return "overdue";
    case "SUBMITTED":
    case "PAID":
      return "success";
    case "NIL":
    case "ARCHIVED":
      return "muted";
    default:
      return "outline";
  }
}
