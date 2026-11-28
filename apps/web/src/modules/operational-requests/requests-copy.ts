import type { OperationalRequest, OperationalRequestQueueStatus } from "@corely/contracts";
import { useTranslation } from "react-i18next";
import strings from "./requests-copy.json";

export type RequestsCopy = typeof strings.en;
export function useRequestsCopy() {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const primary = locale.split("-")[0];
  return {
    locale,
    copy: primary === "de" ? strings.de : primary === "vi" ? strings.vi : strings.en,
  };
}

export function statusOf(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error
    ? Number(error.status)
    : 0;
}

export function statusLabel(status: OperationalRequest["status"], copy: RequestsCopy) {
  return {
    DRAFT: copy.draft,
    SUBMITTED: copy.submitted,
    RETURNED: copy.returned,
    REJECTED: copy.rejected,
    APPROVED: copy.approved,
    WITHDRAWN: copy.withdrawn,
  }[status];
}

export function formatDate(timestamp: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(timestamp));
}

export function queueStatusLabel(status: OperationalRequestQueueStatus, copy: RequestsCopy) {
  switch (status) {
    case "PENDING_APPLICATION":
      return copy.queuePendingApplication;
    case "FAILED_APPLICATION":
      return copy.queueFailedApplication;
    case "APPLIED":
      return copy.queueApplied;
    default:
      return statusLabel(status, copy);
  }
}

export function formatAge(seconds: number, locale: string, copy: RequestsCopy) {
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "always", style: "short" });
  if (seconds < 60) {
    return copy.justNow;
  }
  if (seconds < 3600) {
    return relative.format(-Math.floor(seconds / 60), "minute");
  }
  if (seconds < 86400) {
    return relative.format(-Math.floor(seconds / 3600), "hour");
  }
  return relative.format(-Math.floor(seconds / 86400), "day");
}
