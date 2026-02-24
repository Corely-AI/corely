"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Clock3, MapPin, Star, UserRound } from "lucide-react";
import {
  Badge,
  Button,
  Calendar,
  Card,
  CardContent,
  CardHeader,
  Input,
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
import type {
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

const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toUtcIsoStartOfDay = (date: Date): string =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getBrowserTimezone = (): string | null => {
  try {
    const timezone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timezone) {
      return null;
    }

    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return null;
  }
};

const formatSlotTime = (iso: string, timezone: string): string => {
  const date = new Date(iso);

  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
};

const formatSlotDate = (iso: string, timezone: string): string => {
  const date = new Date(iso);

  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: timezone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date);
  }
};

const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${rem}m`;
};

const formatPrice = (service: PublicBookingService): string => {
  if (!service.priceCents || !service.currency) {
    return "Price on request";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: service.currency,
  }).format(service.priceCents / 100);
};

const groupServices = (services: PublicBookingService[]) => {
  const map = new Map<string, PublicBookingService[]>();
  for (const service of services) {
    const category = service.category?.trim() || "Services";
    const group = map.get(category) ?? [];
    group.push(service);
    map.set(category, group);
  }
  return Array.from(map.entries());
};

export function PublicBookingClient({
  routeSlug,
  page,
  services,
  staff,
  basePath,
  workspaceSlug,
  initial,
}: {
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

  const grouped = useMemo(() => groupServices(services), [services]);

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
          setAvailabilityError("Could not load available slots. Please try again.");
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
    <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:py-10">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">Book Online</p>
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
            <CalendarDays className="h-4 w-4" /> Timezone: {selectedTimezone}
          </span>
        </div>
        {page.description ? (
          <p className="max-w-3xl text-muted-foreground">{page.description}</p>
        ) : null}
      </div>

      <Tabs defaultValue="book" className="mt-8">
        <TabsList>
          <TabsTrigger value="book">Book</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>

        <TabsContent value="book" className="mt-6">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-8">
              <section className="space-y-4 rounded-2xl border bg-card p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Service Menu</h2>
                  <Badge variant="outline">{services.length} services</Badge>
                </div>

                {grouped.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No services are currently available.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {grouped.map(([groupName, items]) => (
                      <div key={groupName} className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          {groupName}
                        </h3>
                        <div className="space-y-2">
                          {items.map((service) => {
                            const selected = selectedService?.id === service.id;

                            return (
                              <Card
                                key={service.id}
                                className={
                                  selected ? "border-accent shadow-sm shadow-accent/20" : ""
                                }
                              >
                                <CardContent className="flex items-start justify-between gap-4 p-4">
                                  <div className="space-y-1">
                                    <p className="font-semibold">{service.name}</p>
                                    {service.description ? (
                                      <p className="text-sm text-muted-foreground">
                                        {service.description}
                                      </p>
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
                                    <p className="font-semibold">{formatPrice(service)}</p>
                                    <Button
                                      size="sm"
                                      variant={selected ? "accent" : "outline"}
                                      onClick={() => onServiceSelect(service.id)}
                                      data-testid={`booking-service-select-${service.id}`}
                                    >
                                      {selected ? "Selected" : "Select"}
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

              <section className="space-y-4 rounded-2xl border bg-card p-5">
                <h2 className="text-lg font-bold">Choose Date & Time</h2>

                {page.allowStaffSelection && staff.length > 0 ? (
                  <div className="max-w-sm">
                    <Select value={selectedStaffId} onValueChange={onStaffSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose staff" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="first-available">First available</SelectItem>
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
                  <Label htmlFor="public-booking-timezone">Display timezone</Label>
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
                      selected={selectedDay ? new Date(`${selectedDay}T00:00:00`) : undefined}
                      onSelect={onDaySelect}
                      disabled={(date) => !availableDaysSet.has(toDateKey(date))}
                    />
                  </div>

                  <div className="space-y-3">
                    {loadingAvailability ? (
                      <p className="text-sm text-muted-foreground">
                        Loading available time slots...
                      </p>
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
                                {formatSlotTime(slot.startAt, selectedTimezone)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatSlotDate(slot.startAt, selectedTimezone)}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {selectedService
                          ? "No slots available for this date. Try another day or staff member."
                          : "Select a service to see available time slots."}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </div>

            <aside className="lg:sticky lg:top-8 lg:self-start">
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-bold">Your Booking</h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedService ? (
                    <div className="space-y-1">
                      <p className="font-semibold">{selectedService.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDuration(selectedService.durationMinutes)}
                      </p>
                      <p className="text-sm font-semibold">{formatPrice(selectedService)}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Choose a service to begin.</p>
                  )}

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <p className="inline-flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                      {selectedSlot?.staffName ??
                        (selectedStaffId === "first-available"
                          ? "First available staff"
                          : (staff.find((item) => item.id === selectedStaffId)?.name ??
                            "Not selected"))}
                    </p>
                    <p className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      {selectedSlot
                        ? formatSlotDate(selectedSlot.startAt, selectedTimezone)
                        : "Date not selected"}
                    </p>
                    <p className="inline-flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-muted-foreground" />
                      {selectedSlot
                        ? `${formatSlotTime(selectedSlot.startAt, selectedTimezone)} - ${formatSlotTime(
                            selectedSlot.endAt,
                            selectedTimezone
                          )}`
                        : "Time not selected"}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">Times shown in {selectedTimezone}</p>

                  <Button
                    asChild
                    disabled={!checkoutHref}
                    className="w-full"
                    variant="accent"
                    data-testid="booking-continue"
                  >
                    <Link href={checkoutHref ?? `${normalizedBase}/${routeSlug}`}>Continue</Link>
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    By continuing, you agree to our booking and cancellation policy.
                  </p>
                </CardContent>
              </Card>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">
                Reviews are coming soon. Your clients will be able to share feedback after
                appointments.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="mt-6">
          <Card>
            <CardContent className="space-y-4 p-6">
              <div>
                <p className="text-sm font-semibold">Opening hours</p>
                <p className="text-sm text-muted-foreground">
                  {page.openingHoursText ?? "Contact venue for opening hours."}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold">Cancellation policy</p>
                <p className="text-sm text-muted-foreground">
                  {page.cancellationPolicyText ??
                    "Please cancel at least 24 hours before your appointment."}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold">Contact</p>
                <Input value={page.venueName} readOnly />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 text-center text-xs text-muted-foreground">
        Powered by Corely Booking
        {workspaceSlug ? <span> for workspace {workspaceSlug}</span> : null}
      </div>
    </div>
  );
}
