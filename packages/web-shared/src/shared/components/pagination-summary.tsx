import { corelyLocaleDetails, resolveCorelyLocale } from "@corely/contracts";
import { useTranslation } from "react-i18next";

type PaginationSummaryProps =
  | { page: number; pages: number; total?: number }
  | { page: number; pages?: undefined; total: number };

export function PaginationSummary({ page, pages, total }: PaginationSummaryProps) {
  const { t, i18n } = useTranslation();
  const locale = resolveCorelyLocale(i18n.resolvedLanguage ?? i18n.language);
  const number = new Intl.NumberFormat(corelyLocaleDetails[locale].format);
  const values = {
    page: number.format(page),
    ...(pages !== undefined && { pages: number.format(pages) }),
    ...(total !== undefined && { total: number.format(total) }),
  };
  if (pages === undefined) {
    return t("common.pageWithItemCount", values);
  }
  return t(total === undefined ? "common.pageOf" : "common.pageOfWithItemCount", values);
}
