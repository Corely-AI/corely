import { corelyLocaleDetails, type OpenBukLocale } from "@corely/contracts";

const wording = {
  en: ["Booking confirmed", "When", "Booking reference"],
  de: ["Termin bestätigt", "Wann", "Buchungsreferenz"],
  vi: ["Đã xác nhận lịch hẹn", "Thời gian", "Mã đặt lịch"],
  tr: ["Randevu onaylandı", "Zaman", "Rezervasyon numarası"],
  pl: ["Wizyta potwierdzona", "Kiedy", "Numer rezerwacji"],
  ru: ["Запись подтверждена", "Когда", "Номер записи"],
  "pt-PT": ["Marcação confirmada", "Quando", "Referência da marcação"],
  it: ["Appuntamento confermato", "Quando", "Riferimento della prenotazione"],
  fr: ["Rendez-vous confirmé", "Quand", "Référence de réservation"],
  es: ["Cita confirmada", "Cuándo", "Referencia de la cita"],
} satisfies Record<OpenBukLocale, [string, string, string]>;

export function appointmentConfirmationCopy(input: {
  locale: OpenBukLocale;
  timezone: string;
  startAt: string;
  reference: string;
  serviceName: string;
}) {
  const [subject, when, reference] = wording[input.locale];
  const date = new Intl.DateTimeFormat(corelyLocaleDetails[input.locale].format, {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: input.timezone,
  }).format(new Date(input.startAt));
  return {
    subject,
    body: [
      input.serviceName,
      `${when} — ${date} (${input.timezone})`,
      `${reference} — ${input.reference}`,
    ].join("\n"),
  };
}
