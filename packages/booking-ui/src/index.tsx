import type { OpenBukReceipt } from "@corely/contracts";
import type { ComponentType } from "react";

export type ConfirmationFooter = ComponentType;

export interface BookingConfirmationProps {
  readonly studioName: string;
  readonly receipt: OpenBukReceipt;
  readonly locale: string;
  readonly labels: Readonly<Record<"success" | "successBody" | "withStaff" | "reference", string>>;
  readonly formatTime: (value: string, timezone: string, locale: string) => string;
  readonly formatMoney: (cents: number, currency: string, locale: string) => string;
  readonly confirmationFooter?: ConfirmationFooter;
}

export function BookingConfirmation({
  studioName,
  receipt,
  locale,
  labels,
  formatTime,
  formatMoney,
  confirmationFooter: Footer,
}: BookingConfirmationProps) {
  return (
    <section className="confirmation">
      <span className="success-icon">✓</span>
      <p className="eyebrow">{studioName}</p>
      <h1>{labels.success}</h1>
      <p className="muted">{labels.successBody}</p>
      <div className="receipt">
        <h2>{receipt.serviceName}</h2>
        <p>
          {new Intl.DateTimeFormat(locale, {
            dateStyle: "full",
            timeZone: receipt.timezone,
          }).format(new Date(receipt.startAt))}
        </p>
        <strong>
          {formatTime(receipt.startAt, receipt.timezone, locale)} –{" "}
          {formatTime(receipt.endAt, receipt.timezone, locale)}
        </strong>
        <p>
          {labels.withStaff} {receipt.staffName} · {receipt.timezone}
        </p>
        <p>{formatMoney(receipt.priceCents, receipt.currency, locale)}</p>
        <hr />
        <small>{labels.reference}</small>
        <p className="reference">{receipt.reference}</p>
      </div>
      {Footer ? <Footer /> : null}
    </section>
  );
}
