import type { OpenBukLocale } from "@corely/contracts";

const copy = {
  en: {
    subject: "Your appointment has been rescheduled",
    reference: "Booking reference",
    time: "New appointment time",
  },
  de: { subject: "Ihr Termin wurde verschoben", reference: "Buchungsnummer", time: "Neuer Termin" },
  vi: { subject: "Lịch hẹn của bạn đã được dời", reference: "Mã đặt lịch", time: "Giờ hẹn mới" },
} satisfies Record<OpenBukLocale, { subject: string; reference: string; time: string }>;

export function appointmentUpdateText(
  input: {
    locale: OpenBukLocale;
    timezone: string;
    startAt: string;
    endAt: string;
    reference: string;
  },
  note: string
) {
  const words = copy[input.locale];
  const date = new Intl.DateTimeFormat(input.locale, {
    timeZone: input.timezone,
    dateStyle: "full",
    timeStyle: "short",
  });
  const starts = date.format(new Date(input.startAt));
  const ends = date.format(new Date(input.endAt));
  const details = [
    `${words.reference}: ${input.reference}`,
    `${words.time}: ${starts} – ${ends} (${input.timezone})`,
  ];
  return {
    subject: words.subject,
    body: note ? `${details.join("\n")}\n\n${note}` : details.join("\n"),
  };
}
