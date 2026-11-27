"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Clock3, UserRound } from "lucide-react";
import {
  Button,
  Calendar,
  Card,
  CardContent,
  CardHeader,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TimezoneSelect,
} from "@/components/ui";
import {
  addDays,
  formatDuration,
  formatPrice,
  formatSlotDate,
  formatSlotTime,
  getBrowserTimezone,
  toDateKey,
  toUtcIsoStartOfDay,
} from "./public-booking-format";
import { BookingHeader, BookingServiceMenu, BookingInfo } from "./public-booking-sections";
import type { PublicBookingMessages } from "./public-booking-messages";
import type {
  CorelyLocale,
  PublicBookingPage,
  PublicBookingService,
  PublicBookingStaff,
  PublicBookingTimeSlot,
} from "@corely/contracts";
import { publicApi } from "@/lib/public-api";

type AvailabilityState = {
  timezone: string;
  availableDays: string[];
  timeSlots: PublicBookingTimeSlot[];
};

export function PublicBookingClient({
  routeSlug,
  page,
  services,
  staff,
  basePath,
  workspaceSlug,
  initial,
  locale,
  copy,
}: {
  locale: CorelyLocale;
  copy: PublicBookingMessages;
  routeSlug: string;
  page: PublicBookingPage;
  services: PublicBookingService[];
  staff: PublicBookingStaff[];
  basePath: string;
  workspaceSlug?: string | null;
  initial?: {
    serviceId?: string;
    staffId?: string;
    day?: string;
    startAt?: string;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    initial?.serviceId && services.some((service) => service.id === initial.serviceId)
      ? initial.serviceId
      : (services[0]?.id ?? null)
  );
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    initial?.staffId && staff.some((member) => member.id === initial.staffId)
      ? initial.staffId
      : "first-available"
  );
  const [selectedTimezone, setSelectedTimezone] = useState<string>(page.timezone || "UTC");
  const [customTimezoneSelected, setCustomTimezoneSelected] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(initial?.day ?? null);
  const [selectedSlotStart, setSelectedSlotStart] = useState<string | null>(
    initial?.startAt ?? null
  );

  const [availability, setAvailability] = useState<AvailabilityState | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [services, selectedServiceId]
  );

  const selectedSlot = useMemo(
    () => availability?.timeSlots.find((slot) => slot.startAt === selectedSlotStart) ?? null,
    [availability, selectedSlotStart]
  );

  const availableDaysSet = useMemo(
    () => new Set(availability?.availableDays ?? []),
    [availability?.availableDays]
  );

  const normalizedBase = basePath.replace(/\/$/, "");

  useEffect(() => {
    if (customTimezoneSelected) {
      return;
    }

    const defaultTimezone =
      getBrowserTimezone() || page.timezone || availability?.timezone || "UTC";
    setSelectedTimezone(defaultTimezone);
  }, [availability?.timezone, customTimezoneSelected, page.timezone]);

  useEffect(() => {
    if (selectedStaffId === "first-available") {
      return;
    }

    const staffExists = staff.some((member) => member.id === selectedStaffId);
    if (staffExists) {
      return;
    }

    setSelectedStaffId("first-available");
    setSelectedSlotStart(null);
  }, [selectedStaffId, staff]);

  const replaceQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (!value) {
          params.delete(key);
          return;
        }
        params.set(key, value);
      });

      const query = params.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    if (!selectedServiceId) {
      setAvailability(null);
      return;
    }

    let cancelled = false;
    setLoadingAvailability(true);
    setAvailabilityError(null);

    const today = new Date();
    const from = toUtcIsoStartOfDay(today);
    const to = toUtcIsoStartOfDay(addDays(today, 35));

    publicApi
      .getPublicBookingAvailability({
        slug: routeSlug,
        serviceId: selectedServiceId,
        staffId: selectedStaffId !== "first-available" ? selectedStaffId : undefined,
        from,
        to,
        day: selectedDay ?? undefined,
        workspaceSlug: workspaceSlug ?? null,
      })
      .then((output) => {
        if (cancelled) {
          return;
        }

        setAvailability(output);

        const fallbackDay = selectedDay ?? output.availableDays[0] ?? null;
        if (!selectedDay && fallbackDay) {
          setSelectedDay(fallbackDay);
          replaceQuery({ day: fallbackDay });
        }

        if (selectedSlotStart) {
          const stillAvailable = output.timeSlots.some(
            (slot) => slot.startAt === selectedSlotStart
          );
          if (!stillAvailable) {
            setSelectedSlotStart(null);
            replaceQuery({ startAt: null, endAt: null, resourceId: null });
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailabilityError(copy.availabilityError);
          setAvailability(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAvailability(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    replaceQuery,
    routeSlug,
    selectedDay,
    selectedServiceId,
    selectedSlotStart,
    selectedStaffId,
    workspaceSlug,
  ]);

  const onServiceSelect = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setSelectedDay(null);
    setSelectedSlotStart(null);
    replaceQuery({
      serviceId,
      step: "time",
      day: null,
      startAt: null,
      endAt: null,
      resourceId: null,
      staffId: selectedStaffId !== "first-available" ? selectedStaffId : null,
    });
  };

  const onStaffSelect = (staffId: string) => {
    setSelectedStaffId(staffId);
    setSelectedSlotStart(null);
    replaceQuery({
      staffId: staffId === "first-available" ? null : staffId,
      startAt: null,
      endAt: null,
      resourceId: null,
    });
  };

  const onTimezoneSelect = (timezone: string) => {
    setSelectedTimezone(timezone);
    setCustomTimezoneSelected(true);
  };

  const onDaySelect = (date: Date | undefined) => {
    if (!date) {
      return;
    }
    const key = toDateKey(date);
    setSelectedDay(key);
    setSelectedSlotStart(null);
    replaceQuery({ day: key, startAt: null, endAt: null, resourceId: null });
  };

  const onSlotSelect = (slot: PublicBookingTimeSlot) => {
    setSelectedSlotStart(slot.startAt);
    replaceQuery({
      startAt: slot.startAt,
      endAt: slot.endAt,
      staffId: slot.staffId,
      resourceId: slot.resourceId,
    });
  };

  const checkoutHref = (() => {
    if (!selectedService || !selectedSlot) {
      return null;
    }

    const params = new URLSearchParams({
      lang: locale,
      serviceId: selectedService.id,
      startAt: selectedSlot.startAt,
      endAt: selectedSlot.endAt,
      resourceId: selectedSlot.resourceId,
    });

    if (selectedSlot.staffId) {
      params.set("staffId", selectedSlot.staffId);
    }

    return `${normalizedBase}/${routeSlug}/checkout?${params.toString()}`;
  })();

  return (
    <div lang={locale} className="mx-auto w-full max-w-7xl px-6 py-8 lg:py-10">
      <BookingHeader page={page} selectedTimezone={selectedTimezone} copy={copy} />

      <Tabs defaultValue="book" className="mt-8">
        <TabsList>
          <TabsTrigger value="book">{copy.book}</TabsTrigger>
          <TabsTrigger value="reviews">{copy.reviews}</TabsTrigger>
          <TabsTrigger value="info">{copy.info}</TabsTrigger>
        </TabsList>

        <TabsContent value="book" className="mt-6">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-8">
              <BookingServiceMenu
                services={services}
                selectedServiceId={selectedService?.id}
                onServiceSelect={onServiceSelect}
                locale={locale}
                copy={copy}
              />

              <section className="space-y-4 rounded-2xl border bg-card p-5">
                <h2 className="text-lg font-bold">{copy.chooseDateTime}</h2>

                {page.allowStaffSelection && staff.length > 0 ? (
                  <div className="max-w-sm">
                    <Select value={selectedStaffId} onValueChange={onStaffSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder={copy.chooseStaff} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="first-available">{copy.firstAvailable}</SelectItem>
                        {staff.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div className="max-w-sm space-y-1">
                  <Label htmlFor="public-booking-timezone">{copy.displayTimezone}</Label>
                  <TimezoneSelect
                    id="public-booking-timezone"
                    value={selectedTimezone}
                    onChange={onTimezoneSelect}
                  />
                </div>

                <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                  <div className="rounded-xl border p-2">
                    <Calendar
                      mode="single"
                      formatters={{
                        formatCaption: (date) =>
                          new Intl.DateTimeFormat(locale, {
                            month: "long",
                            year: "numeric",
                          }).format(date),
                        formatWeekdayName: (date) =>
                          new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date),
                      }}
                      selected={selectedDay ? new Date(`${selectedDay}T00:00:00`) : undefined}
                      onSelect={onDaySelect}
                      disabled={(date) => !availableDaysSet.has(toDateKey(date))}
                    />
                  </div>

                  <div className="space-y-3">
                    {loadingAvailability ? (
                      <p className="text-sm text-muted-foreground">{copy.loadingSlots}</p>
                    ) : availabilityError ? (
                      <p className="text-sm text-destructive">{availabilityError}</p>
                    ) : availability?.timeSlots.length ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {availability.timeSlots.map((slot) => {
                          const selected = slot.startAt === selectedSlotStart;
                          return (
                            <button
                              key={slot.startAt}
                              type="button"
                              data-testid={`booking-slot-${slot.startAt}`}
                              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                                selected
                                  ? "border-accent bg-accent/10 text-accent"
                                  : "border-border hover:border-accent/40"
                              }`}
                              onClick={() => onSlotSelect(slot)}
                            >
                              <p className="font-semibold">
                                {formatSlotTime(slot.startAt, selectedTimezone, locale)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatSlotDate(slot.startAt, selectedTimezone, locale)}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {selectedService ? copy.noSlots : copy.selectService}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </div>

            <aside className="lg:sticky lg:top-8 lg:self-start">
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-bold">{copy.yourBooking}</h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedService ? (
                    <div className="space-y-1">
                      <p className="font-semibold">{selectedService.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDuration(selectedService.durationMinutes)}
                      </p>
                      <p className="text-sm font-semibold">
                        {formatPrice(selectedService, locale, copy.priceOnRequest)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{copy.begin}</p>
                  )}

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <p className="inline-flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                      {selectedSlot?.staffName ??
                        (selectedStaffId === "first-available"
                          ? copy.firstAvailableStaff
                          : (staff.find((item) => item.id === selectedStaffId)?.name ??
                            copy.notSelected))}
                    </p>
                    <p className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      {selectedSlot
                        ? formatSlotDate(selectedSlot.startAt, selectedTimezone, locale)
                        : copy.dateNotSelected}
                    </p>
                    <p className="inline-flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-muted-foreground" />
                      {selectedSlot
                        ? `${formatSlotTime(selectedSlot.startAt, selectedTimezone, locale)} - ${formatSlotTime(
                            selectedSlot.endAt,
                            selectedTimezone,
                            locale
                          )}`
                        : copy.timeNotSelected}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {copy.timesShown.replace("{{timezone}}", selectedTimezone)}
                  </p>

                  <Button
                    asChild
                    disabled={!checkoutHref}
                    className="w-full"
                    variant="accent"
                    data-testid="booking-continue"
                  >
                    <Link href={checkoutHref ?? `${normalizedBase}/${routeSlug}`}>
                      {copy.continue}
                    </Link>
                  </Button>

                  <p className="text-xs text-muted-foreground">{copy.policyAgreement}</p>
                </CardContent>
              </Card>
            </aside>
          </div>
        </TabsContent>

        <BookingInfo page={page} copy={copy} />
      </Tabs>

      <div className="mt-8 text-center text-xs text-muted-foreground">
        {workspaceSlug
          ? copy.poweredByWorkspace.replace("{{workspace}}", workspaceSlug)
          : copy.poweredBy}
      </div>
    </div>
  );
}
