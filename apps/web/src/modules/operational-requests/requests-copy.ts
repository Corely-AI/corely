import type { OperationalRequest } from "@corely/contracts";
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
