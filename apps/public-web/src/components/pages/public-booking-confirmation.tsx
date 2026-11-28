import Link from "next/link";
import { Button, Card, CardContent, CardHeader } from "@/components/ui";
import type { CorelyLocale, PublicBookingSummary } from "@corely/contracts";
import { formatBookingDateTime } from "./public-booking-format";
import type { PublicBookingMessages } from "./public-booking-messages";

const buildCalendarIcs = (input: {
  bookingId: string;
  title: string;
  startAt: string;
  endAt: string;
  description?: string;
  location?: string;
}) => {
  const utc = (iso: string) =>
    new Date(iso)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Corely//Public Booking//EN",
    "BEGIN:VEVENT",
    `UID:${input.bookingId}@corely.one`,
    `DTSTAMP:${utc(new Date().toISOString())}`,
    `DTSTART:${utc(input.startAt)}`,
    `DTEND:${utc(input.endAt)}`,
    `SUMMARY:${input.title}`,
    input.description ? `DESCRIPTION:${input.description.replace(/\n/g, "\\n")}` : null,
    input.location ? `LOCATION:${input.location}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
};

export function PublicBookingConfirmation({
  booking,
  basePath,
  slug,
  locale,
  copy,
}: {
  booking: PublicBookingSummary;
  basePath: string;
  slug: string;
  locale: CorelyLocale;
  copy: PublicBookingMessages;
}) {
  const location = [
    booking.address?.line1,
    booking.address?.city,
    booking.address?.postalCode,
    booking.address?.countryCode,
  ]
    .filter(Boolean)
    .join(", ");

  const ics = buildCalendarIcs({
    bookingId: booking.id,
    title: `${booking.serviceName ?? copy.appointment} - ${booking.venueName}`,
    startAt: booking.startAt,
    endAt: booking.endAt,
    description: copy.calendarReference.replace("{{id}}", booking.referenceNumber ?? booking.id),
    location: location || undefined,
  });

  const mapHref = location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
    : null;

  return (
    <div lang={locale} className="mx-auto w-full max-w-3xl px-6 py-10">
      <Card>
        <CardHeader>
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">
            {copy.success}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">{copy.confirmed}</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {copy.bookingId}: <span className="font-semibold text-foreground">{booking.id}</span>
          </p>

          <div className="rounded-xl border bg-muted/20 p-4 text-sm">
            <p className="font-semibold">{booking.serviceName ?? copy.appointment}</p>
            <p className="text-muted-foreground">
              {formatBookingDateTime(booking.startAt, locale)}
            </p>
            <p className="text-muted-foreground">
              {copy.venue}: {booking.venueName}
            </p>
            {booking.staffName ? (
              <p className="text-muted-foreground">
                {copy.staff}: {booking.staffName}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="accent">
              <a
                href={`data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`}
                download={`booking-${booking.id}.ics`}
              >
                {copy.addCalendar}
              </a>
            </Button>
            {mapHref ? (
              <Button asChild variant="outline">
                <a href={mapHref} target="_blank" rel="noreferrer">
                  {copy.openMap}
                </a>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href={`${basePath}/${slug}?lang=${locale}`}>{copy.bookAnother}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
