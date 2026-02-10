"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Info,
  MapPin,
  Share2,
  Users,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Calendar,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Logo,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  cn,
  type CarouselApi,
} from "@/components/ui";
import type { RentalContactSettings, RentalProperty } from "@corely/contracts";
import { buildPublicFileUrl, publicApi } from "@/lib/public-api";
import { AnswerBlock } from "@/components/sections/answer-block";
import { FaqBlock, type FaqItem } from "@/components/sections/faq-block";

const formatIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isPastDay = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const candidate = new Date(date);
  candidate.setHours(0, 0, 0, 0);
  return candidate < today;
};

const isBeforeDay = (date: Date, compare: Date) => date.getTime() < compare.getTime();

const normalizePhoneForTel = (value: string) => value.replace(/[^+\d]/g, "");

const resolveHostContactAction = (settings: RentalContactSettings | null | undefined) => {
  if (!settings) {
    return null;
  }

  if (settings.hostContactMethod === "EMAIL" && settings.hostContactEmail) {
    return {
      href: `mailto:${settings.hostContactEmail}`,
      label: "Email Host",
      value: settings.hostContactEmail,
      valueLabel: "Email",
    };
  }

  if (settings.hostContactMethod === "PHONE" && settings.hostContactPhone) {
    const tel = normalizePhoneForTel(settings.hostContactPhone);
    if (tel) {
      return {
        href: `tel:${tel}`,
        label: "Call Host",
        value: settings.hostContactPhone,
        valueLabel: "Phone",
      };
    }
  }

  return null;
};

export function RentalDetailClient({
  property,
  contactSettings,
  workspaceSlug,
  basePath,
  summary,
  bullets,
  faqs,
}: {
  property: RentalProperty;
  contactSettings?: RentalContactSettings | null;
  workspaceSlug?: string | null;
  basePath: string;
  summary: string;
  bullets: string[];
  faqs: FaqItem[];
}) {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  const [api, setApi] = useState<CarouselApi>();
  const [mobileApi, setMobileApi] = useState<CarouselApi>();
  const [currentMobile, setCurrentMobile] = useState(0);
  const [currentGallery, setCurrentGallery] = useState(0);

  useEffect(() => {
    if (!mobileApi) {
      return;
    }

    setCurrentMobile(mobileApi.selectedScrollSnap() + 1);

    mobileApi.on("select", () => {
      setCurrentMobile(mobileApi.selectedScrollSnap() + 1);
    });
  }, [mobileApi]);

  const fromDate = dateRange.from ? formatIsoDate(dateRange.from) : "";
  const toDate = dateRange.to ? formatIsoDate(dateRange.to) : "";
  const checkAvailabilityEnabled = Boolean(dateRange.from && dateRange.to);

  const [availabilityState, setAvailabilityState] = useState<{
    isAvailable: boolean;
  } | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!checkAvailabilityEnabled) {
      setAvailabilityState(null);
      return;
    }

    let isCancelled = false;
    setIsChecking(true);

    publicApi
      .checkRentalAvailability({
        propertySlug: property.slug,
        from: fromDate,
        to: toDate,
        workspaceSlug,
      })
      .then((result) => {
        if (!isCancelled) {
          setAvailabilityState(result);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setAvailabilityState(null);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsChecking(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [checkAvailabilityEnabled, fromDate, toDate, property.slug, workspaceSlug]);

  const allImages = useMemo(
    () => [...property.images].sort((a, b) => a.sortOrder - b.sortOrder),
    [property.images]
  );

  const checkInLabel = property.checkIn || "After 3:00 PM";
  const checkOutLabel = property.checkOut || "11:00 AM";
  const offers = property.offers?.length
    ? property.offers
    : ["Wifi", "Kitchen", "Free parking on premises", "Air conditioning"];
  const hostContactAction = resolveHostContactAction(contactSettings);

  useEffect(() => {
    if (api && isGalleryOpen) {
      api.scrollTo(galleryStartIndex, true);
    }
  }, [api, isGalleryOpen, galleryStartIndex]);

  useEffect(() => {
    if (!api || !isGalleryOpen) {
      return;
    }

    const updateCurrent = () => {
      setCurrentGallery(api.selectedScrollSnap() + 1);
    };

    updateCurrent();
    api.on("select", updateCurrent);
    api.on("reInit", updateCurrent);

    return () => {
      api.off("select", updateCurrent);
      api.off("reInit", updateCurrent);
    };
  }, [api, isGalleryOpen]);

  useEffect(() => {
    if (!isGalleryOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsGalleryOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isGalleryOpen]);

  const openGallery = (index: number) => {
    setGalleryStartIndex(index);
    setIsGalleryOpen(true);
  };

  const handleFromSelect = (selected: Date | undefined) => {
    setDateRange((prev) => {
      if (!selected) {
        return { from: undefined, to: undefined };
      }
      if (prev.to && isBeforeDay(prev.to, addDays(selected, 1))) {
        return { from: selected, to: undefined };
      }
      return { ...prev, from: selected };
    });
  };

  const handleToSelect = (selected: Date | undefined) => {
    setDateRange((prev) => ({ ...prev, to: selected }));
  };

  const availabilityResult = availabilityState;
  const isCheckingResult = isChecking;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-ml-2 text-muted-foreground hover:text-foreground"
            >
              <Link href={basePath}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2">
              <Logo size="sm" />
              <span className="text-sm font-semibold truncate max-w-[200px]">{property.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">
        <div className="block sm:hidden mb-6 relative rounded-2xl overflow-hidden shadow-xl aspect-[4/3] bg-muted">
          {allImages.length > 0 ? (
            <Carousel setApi={setMobileApi} className="w-full h-full">
              <CarouselContent className="h-full -ml-0">
                {allImages.map((img, index) => (
                  <CarouselItem
                    key={img.id}
                    onClick={() => openGallery(index)}
                    className="pl-0 h-full cursor-pointer"
                  >
                    <img
                      src={buildPublicFileUrl(img.fileId)}
                      alt={img.altText || property.name}
                      className="w-full h-full object-cover"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              {allImages.length > 1 && (
                <div className="absolute bottom-3 right-3 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm shadow-sm pointer-events-none">
                  {currentMobile} / {allImages.length}
                </div>
              )}
            </Carousel>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-muted-foreground text-sm">No images</p>
            </div>
          )}
        </div>

        <section className="hidden sm:grid gap-3 sm:grid-cols-4 sm:grid-rows-2 h-[400px] sm:h-[550px] rounded-3xl overflow-hidden shadow-2xl">
          {allImages.length > 0 ? (
            <>
              <div
                className="sm:col-span-2 sm:row-span-2 relative group cursor-pointer overflow-hidden bg-muted"
                onClick={() => openGallery(0)}
              >
                <img
                  src={buildPublicFileUrl(allImages[0].fileId)}
                  alt={allImages[0].altText || property.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div
                className="hidden sm:block sm:col-span-1 relative group cursor-pointer overflow-hidden bg-muted"
                onClick={() => openGallery(1)}
              >
                {allImages[1] && (
                  <img
                    src={buildPublicFileUrl(allImages[1].fileId)}
                    alt={allImages[1].altText || property.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                )}
              </div>
              <div
                className="hidden sm:block sm:col-span-1 relative group cursor-pointer overflow-hidden bg-muted"
                onClick={() => openGallery(2)}
              >
                {allImages[2] && (
                  <img
                    src={buildPublicFileUrl(allImages[2].fileId)}
                    alt={allImages[2].altText || property.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                )}
              </div>
              <div
                className="hidden sm:block sm:col-span-1 relative group cursor-pointer overflow-hidden bg-muted"
                onClick={() => openGallery(3)}
              >
                {allImages[3] && (
                  <img
                    src={buildPublicFileUrl(allImages[3].fileId)}
                    alt={allImages[3].altText || property.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                )}
              </div>
              <div
                className="hidden sm:block sm:col-span-1 relative group cursor-pointer overflow-hidden bg-muted"
                onClick={() => openGallery(4)}
              >
                {allImages[4] && (
                  <>
                    <img
                      src={buildPublicFileUrl(allImages[4].fileId)}
                      alt={allImages[4].altText || property.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {allImages.length > 5 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                        <span className="text-white font-bold text-lg">
                          +{allImages.length - 5} photos
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="col-span-4 row-span-2 bg-muted flex items-center justify-center">
              <p className="text-muted-foreground">No images available for this property.</p>
            </div>
          )}
        </section>

        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-12">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge variant="outline" className="bg-accent/5 text-accent border-accent/20">
                    Guest Favorite
                  </Badge>
                  <Badge variant="secondary">Rare find</Badge>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                  {property.name}
                </h1>
                <div className="flex items-center gap-4 text-muted-foreground font-medium">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>Up to {property.maxGuests || 2} guests</span>
                  </div>
                  <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>Private Location</span>
                  </div>
                </div>
              </div>

              {property.summary && (
                <p className="text-xl text-muted-foreground leading-relaxed font-medium">
                  {property.summary}
                </p>
              )}
            </div>

            <Separator />

            {/* <AnswerBlock summary={summary} bullets={bullets} /> */}

            <div className="space-y-6">
              <h2 className="text-2xl font-bold">About this space</h2>
              <div
                className="prose prose-lg max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-a:text-accent prose-img:rounded-2xl"
                dangerouslySetInnerHTML={{
                  __html: property.descriptionHtml || "<p>No description provided.</p>",
                }}
              />
            </div>

            <Separator />

            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-6">
                <h3 className="text-xl font-bold">House rules</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">Check-in: {checkInLabel}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">Check-out: {checkOutLabel}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">No more than {property.maxGuests || 2} guests</span>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <h3 className="text-xl font-bold">What this place offers</h3>
                <div className="grid grid-cols-1 gap-3">
                  {offers.map((offer) => (
                    <div key={offer} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-accent" />
                      <span className="text-sm font-medium">{offer}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {faqs.length > 0 ? (
              <>
                <Separator />
                <FaqBlock items={faqs} />
              </>
            ) : null}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-xl border-border/60 bg-card rounded-3xl overflow-hidden">
              <CardHeader className="bg-accent/[0.03] pb-6">
                <div className="flex items-end gap-2">
                  {property.price && property.currency ? (
                    <>
                      <span className="text-3xl font-extrabold text-foreground">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: property.currency,
                        }).format(property.price)}
                      </span>
                      <span className="text-muted-foreground font-medium pb-1">night</span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-extrabold text-foreground">Check</span>
                      <span className="text-muted-foreground font-medium pb-1">availability</span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-px bg-border/50 border border-border rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-card p-3 space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Check-in
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-sm font-bold w-full text-left truncate hover:text-accent transition-colors">
                          {dateRange.from ? formatDisplayDate(dateRange.from) : "Add date"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRange.from}
                          onSelect={handleFromSelect}
                          disabled={(date) => isPastDay(date) && !isSameDay(date, new Date())}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="bg-card p-3 space-y-1 border-l border-border">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Check-out
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-sm font-bold w-full text-left truncate hover:text-accent transition-colors">
                          {dateRange.to ? formatDisplayDate(dateRange.to) : "Add date"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={dateRange.to}
                          onSelect={handleToSelect}
                          disabled={(date) => {
                            if (dateRange.from) {
                              return isBeforeDay(date, addDays(dateRange.from, 1));
                            }
                            return isPastDay(date);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {checkAvailabilityEnabled && (
                  <div
                    className={cn(
                      "p-4 rounded-xl border flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-2",
                      isCheckingResult
                        ? "bg-muted animate-pulse"
                        : availabilityResult?.isAvailable
                          ? "bg-accent/10 border-accent/20 text-accent"
                          : "bg-destructive/10 border-destructive/20 text-destructive"
                    )}
                  >
                    {isCheckingResult ? (
                      <Clock className="h-5 w-5 shrink-0 animate-spin" />
                    ) : availabilityResult?.isAvailable ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                    ) : (
                      <Info className="h-5 w-5 shrink-0" />
                    )}
                    <div className="space-y-1">
                      <p className="font-bold text-sm">
                        {isCheckingResult
                          ? "Checking..."
                          : availabilityResult?.isAvailable
                            ? "Available for your dates!"
                            : "Not available"}
                      </p>
                      {!isCheckingResult && availabilityResult && (
                        <p className="text-xs opacity-90 leading-snug">
                          {availabilityResult.isAvailable
                            ? "Your dates are open. Contact the host directly to confirm."
                            : "This property is blocked for some of the selected dates. Please try another range."}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {hostContactAction ? (
                  <Button
                    asChild
                    className="w-full h-14 rounded-xl text-lg font-bold shadow-lg shadow-accent/20 transition-all hover:shadow-accent/30 active:scale-[0.98]"
                    variant="accent"
                  >
                    <a href={hostContactAction.href}>{hostContactAction.label}</a>
                  </Button>
                ) : (
                  <Button
                    className="w-full h-14 rounded-xl text-lg font-bold shadow-lg shadow-accent/20"
                    variant="accent"
                    disabled
                  >
                    Contact Host Unavailable
                  </Button>
                )}

                {hostContactAction ? (
                  <p className="text-center text-xs text-muted-foreground">
                    {hostContactAction.valueLabel}:{" "}
                    <a
                      href={hostContactAction.href}
                      className="font-medium text-foreground hover:text-accent transition-colors"
                    >
                      {hostContactAction.value}
                    </a>
                  </p>
                ) : (
                  <p className="text-center text-xs text-muted-foreground">
                    Contact is handled directly with the property host.
                  </p>
                )}
              </CardContent>
              <CardFooter className="bg-muted/30 p-4 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  <p>Communication is managed directly between guest and property host.</p>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 border-t border-border pt-12 pb-20 mt-20 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <p className="text-sm font-semibold">Ready for your adventure at {property.name}?</p>
          </div>
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <a href="#">Report listing</a>
            </Button>
            {hostContactAction ? (
              <Button asChild variant="accent" size="sm">
                <a href={hostContactAction.href}>{hostContactAction.label}</a>
              </Button>
            ) : (
              <Button variant="accent" size="sm" disabled>
                Contact Host
              </Button>
            )}
          </div>
        </div>
      </footer>

      {isGalleryOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label={`${property.name} photo gallery`}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/80"
            aria-label="Close gallery"
            onClick={() => setIsGalleryOpen(false)}
          />
          <div
            className="relative w-full h-[90vh] md:h-screen max-h-screen max-w-screen-xl p-0 bg-background/95 border-none flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute top-4 left-4 z-50">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsGalleryOpen(false)}
                className="rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 flex items-center justify-center p-4 md:p-12 overflow-hidden h-full">
              <Carousel setApi={setApi} className="w-full max-w-5xl">
                <CarouselContent>
                  {allImages.map((img) => (
                    <CarouselItem
                      key={img.id}
                      className="flex items-center justify-center h-[70vh] md:h-[80vh]"
                    >
                      <img
                        src={buildPublicFileUrl(img.fileId)}
                        alt={img.altText || property.name}
                        className="max-h-full max-w-full object-contain rounded-md"
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <div className="hidden md:block">
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={() => api?.scrollPrev()}
                    className="absolute left-6 top-1/2 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white shadow-lg backdrop-blur-md transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={() => api?.scrollNext()}
                    className="absolute right-6 top-1/2 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white shadow-lg backdrop-blur-md transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </div>
              </Carousel>
            </div>

            <div className="absolute bottom-4 left-0 right-0 flex justify-center text-white/80 text-sm">
              {api && (
                <span>
                  {currentGallery} / {allImages.length}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
