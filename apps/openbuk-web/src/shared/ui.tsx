import { Link } from "react-router-dom";
import { brand } from "./brand";
import { useLanguage } from "./i18n";
import type { ReactNode } from "react";
export function Logo() {
  return (
    <Link to="/" className="logo">
      <span className="brand-mark" aria-hidden="true">
        b
      </span>
      {brand.name}
      <span className="logo-dot">.</span>
    </Link>
  );
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function ErrorMessage({
  message = "requestFailed",
}: {
  message?:
    | "inviteError"
    | "invalidTimezone"
    | "requestFailed"
    | "slotConflict"
    | "setupError"
    | "loginError"
    | "signupError";
}) {
  const { t } = useLanguage();
  return (
    <p className="error" role="alert">
      {t(message)}
    </p>
  );
}
export function Loading() {
  const { t } = useLanguage();
  return (
    <p role="status" className="loading">
      {t("loading")}
    </p>
  );
}
export const localDay = (timezone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const v = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${v("year")}-${v("month")}-${v("day")}`;
};
export const money = (value: number, currency: string, locale: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency }).format(value / 100);
export const time = (value: string, timezone: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
