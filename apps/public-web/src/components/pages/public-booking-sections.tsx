import type { CorelyLocale, PublicBookingPage, PublicBookingService } from "@corely/contracts";
import { CalendarDays, Clock3, MapPin, Star } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, TabsContent } from "@/components/ui";
import { formatDuration, formatPrice, groupServices } from "./public-booking-format";
import type { PublicBookingMessages } from "./public-booking-messages";

export function BookingHeader({
  page,
  selectedTimezone,
  copy,
}: {
  page: PublicBookingPage;
  selectedTimezone: string;
  copy: PublicBookingMessages;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold uppercase tracking-wider text-accent">
        {copy.bookOnline}
      </p>
      <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{page.venueName}</h1>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Star className="h-4 w-4" /> 4.9 (120)
        </span>
        {page.address?.city ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-4 w-4" /> {page.address.city}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-4 w-4" /> {copy.timezone}: {selectedTimezone}
        </span>
      </div>
      {page.description ? (
        <p className="max-w-3xl text-muted-foreground">{page.description}</p>
      ) : null}
    </div>
  );
}

export function BookingServiceMenu({
  services,
  selectedServiceId,
  onServiceSelect,
  locale,
  copy,
}: {
  services: PublicBookingService[];
  selectedServiceId?: string;
  onServiceSelect: (serviceId: string) => void;
  locale: CorelyLocale;
  copy: PublicBookingMessages;
}) {
  const grouped = groupServices(services, copy.services);
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{copy.serviceMenu}</h2>
        <Badge variant="outline">
          {copy.services} · {new Intl.NumberFormat(locale).format(services.length)}
        </Badge>
      </div>

      {grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.noServices}</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([groupName, items]) => (
            <div key={groupName} className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {groupName}
              </h3>
              <div className="space-y-2">
                {items.map((service) => {
                  const selected = selectedServiceId === service.id;

                  return (
                    <Card
                      key={service.id}
                      className={selected ? "border-accent shadow-sm shadow-accent/20" : ""}
                    >
                      <CardContent className="flex items-start justify-between gap-4 p-4">
                        <div className="space-y-1">
                          <p className="font-semibold">{service.name}</p>
                          {service.description ? (
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="h-3.5 w-3.5" />
                              {formatDuration(service.durationMinutes)}
                            </span>
                            {service.badges.map((badge) => (
                              <Badge
                                key={badge}
                                variant="secondary"
                                className="text-[10px] uppercase"
                              >
                                {badge}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2 text-right">
                          <p className="font-semibold">
                            {formatPrice(service, locale, copy.priceOnRequest)}
                          </p>
                          <Button
                            size="sm"
                            variant={selected ? "accent" : "outline"}
                            onClick={() => onServiceSelect(service.id)}
                            data-testid={`booking-service-select-${service.id}`}
                          >
                            {selected ? copy.selected : copy.select}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function BookingInfo({
  page,
  copy,
}: {
  page: PublicBookingPage;
  copy: PublicBookingMessages;
}) {
  return (
    <>
      <TabsContent value="reviews" className="mt-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">{copy.reviewsComing}</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="info" className="mt-6">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <p className="text-sm font-semibold">{copy.openingHours}</p>
              <p className="text-sm text-muted-foreground">
                {page.openingHoursText ?? copy.contactHours}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold">{copy.cancellationPolicy}</p>
              <p className="text-sm text-muted-foreground">
                {page.cancellationPolicyText ?? copy.cancelBefore}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold">{copy.contact}</p>
              <Input value={page.venueName} readOnly />
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </>
  );
}
