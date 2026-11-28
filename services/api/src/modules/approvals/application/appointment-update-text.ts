import type { OpenBukLocale } from "@corely/contracts";

const copy = {
  en: {
    subject: "Your appointment has been rescheduled",
    confirmation: "Your appointment is confirmed",
    confirmedTime: "Appointment time",
    reference: "Booking reference",
    time: "New appointment time",
  },
  de: {
    subject: "Ihr Termin wurde verschoben",
    confirmation: "Ihr Termin ist bestätigt",
    confirmedTime: "Termin",
    reference: "Buchungsnummer",
    time: "Neuer Termin",
  },
  vi: {
    subject: "Lịch hẹn của bạn đã được dời",
    confirmation: "Lịch hẹn của bạn đã được xác nhận",
    confirmedTime: "Giờ hẹn",
    reference: "Mã đặt lịch",
    time: "Giờ hẹn mới",
  },
};

export function appointmentUpdateText(
  input: {
    locale: OpenBukLocale;
    timezone: string;
    startAt: string;
    endAt: string;
    reference: string;
  },
  note: string,
  confirm = false
) {
  const words = input.locale === "de" ? copy.de : input.locale === "vi" ? copy.vi : copy.en;
  const date = new Intl.DateTimeFormat(input.locale, {
    timeZone: input.timezone,
    dateStyle: "full",
    timeStyle: "short",
  });
  const starts = date.format(new Date(input.startAt));
  const ends = date.format(new Date(input.endAt));
  const details = [
    `${words.reference}: ${input.reference}`,
    `${confirm ? words.confirmedTime : words.time}: ${starts} – ${ends} (${input.timezone})`,
  ];
  return {
    subject: confirm ? words.confirmation : words.subject,
    body: note ? `${details.join("\n")}\n\n${note}` : details.join("\n"),
  };
}
