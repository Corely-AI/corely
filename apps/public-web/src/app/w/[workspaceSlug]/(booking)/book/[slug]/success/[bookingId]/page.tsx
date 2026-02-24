import Link from "next/link";
import { getRequestContext } from "@/lib/request-context";
import { Button, Card, CardContent, CardHeader } from "@/components/ui";
import { PublicDisabledState } from "@/components/sections/public-disabled";
import {
  BOOKING_REVALIDATE,
  getPublicBookingMetadata,
  getPublicBookingSummaryData,
} from "@/app/(booking)/book/_shared";

export const revalidate = BOOKING_REVALIDATE;

const formatDateTime = (iso: string): string =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspaceSlug: string; slug: string; bookingId: string }>;
}) {
  const ctx = await getRequestContext();
  const { workspaceSlug, slug, bookingId } = await params;
  return getPublicBookingMetadata({
    ctx,
    workspaceSlug,
    slug,
    pathSuffix: `/success/${bookingId}`,
  });
}

export default async function WorkspacePublicBookingSuccessPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; slug: string; bookingId: string }>;
}) {
  const ctx = await getRequestContext();
  const { workspaceSlug, slug, bookingId } = await params;

  const result = await getPublicBookingSummaryData({
    ctx,
    workspaceSlug,
    slug,
    bookingId,
  });

  if (result.kind === "disabled") {
    return <PublicDisabledState message={result.message} />;
  }

  const location = [
    result.booking.address?.line1,
    result.booking.address?.city,
    result.booking.address?.postalCode,
    result.booking.address?.countryCode,
  ]
    .filter(Boolean)
    .join(", ");

  const ics = buildCalendarIcs({
    bookingId: result.booking.id,
    title: `${result.booking.serviceName ?? "Appointment"} - ${result.booking.venueName}`,
    startAt: result.booking.startAt,
    endAt: result.booking.endAt,
    description: `Booking #${result.booking.referenceNumber ?? result.booking.id}`,
    location: location || undefined,
  });

  const mapHref = location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
    : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <Card>
        <CardHeader>
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Success</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Your booking is confirmed</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Booking ID: <span className="font-semibold text-foreground">{result.booking.id}</span>
          </p>

          <div className="rounded-xl border bg-muted/20 p-4 text-sm">
            <p className="font-semibold">{result.booking.serviceName ?? "Appointment"}</p>
            <p className="text-muted-foreground">{formatDateTime(result.booking.startAt)}</p>
            <p className="text-muted-foreground">Venue: {result.booking.venueName}</p>
            {result.booking.staffName ? (
              <p className="text-muted-foreground">Staff: {result.booking.staffName}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="accent">
              <a
                href={`data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`}
                download={`booking-${result.booking.id}.ics`}
              >
                Add to calendar
              </a>
            </Button>
            {mapHref ? (
              <Button asChild variant="outline">
                <a href={mapHref} target="_blank" rel="noreferrer">
                  Open map
                </a>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href={`${result.basePath}/${slug}`}>Book another service</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
