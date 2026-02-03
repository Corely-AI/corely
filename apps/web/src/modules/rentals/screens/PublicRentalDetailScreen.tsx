import React, { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  ChevronLeft,
  Calendar as CalendarIcon,
  MapPin,
  Share2,
  Heart,
  CheckCircle2,
  Info,
  Clock,
  ExternalLink,
  X,
} from "lucide-react";
import { format, addDays, isPast, isBefore, isSameDay, parseISO } from "date-fns";
import { Button } from "@corely/ui";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Separator } from "@corely/ui";
import { Calendar } from "@corely/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@corely/ui";
import { Dialog, DialogContent, DialogClose } from "@corely/ui";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@corely/ui";
import { Logo } from "@/shared/components/Logo";
import { rentalsApi, buildPublicFileUrl } from "@/lib/rentals-api";
import { rentalsPublicKeys } from "../queries";
import { cn } from "@/shared/lib/utils";
import { usePublicWorkspace } from "@/shared/public-workspace";

export default function PublicRentalDetailScreen() {
  const { slug } = useParams<{ slug: string }>();
  const { workspaceSlug } = usePublicWorkspace();
  const basePath = workspaceSlug ? `/w/${workspaceSlug}/rental` : "/rental";
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  const [api, setApi] = useState<CarouselApi>();
  const [mobileApi, setMobileApi] = useState<CarouselApi>();
  const [currentMobile, setCurrentMobile] = useState(0);

  useEffect(() => {
    if (!mobileApi) {
      return;
    }

    setCurrentMobile(mobileApi.selectedScrollSnap() + 1);

    mobileApi.on("select", () => {
      setCurrentMobile(mobileApi.selectedScrollSnap() + 1);
    });
  }, [mobileApi]);

  const {
    data: property,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: rentalsPublicKeys.property(workspaceSlug, slug),
    queryFn: () => rentalsApi.getPublicProperty(slug!),
    enabled: !!slug,
  });

  const checkAvailabilityEnabled = !!property && !!dateRange.from && !!dateRange.to;

  const { data: availability, isFetching: isCheckingAvailability } = useQuery({
    queryKey: rentalsPublicKeys.availability(
      workspaceSlug,
      slug!,
      dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "",
      dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : ""
    ),
    queryFn: () =>
      rentalsApi.checkAvailability({
        propertySlug: slug!,
        from: format(dateRange.from!, "yyyy-MM-dd"),
        to: format(dateRange.to!, "yyyy-MM-dd"),
      }),
    enabled: checkAvailabilityEnabled,
  });

  const allImages = useMemo(() => {
    if (!property) {
      return [];
    }
    const list = [...property.images].sort((a, b) => a.sortOrder - b.sortOrder);
    return list;
  }, [property]);

  useEffect(() => {
    if (api && isGalleryOpen) {
      api.scrollTo(galleryStartIndex, true);
    }
  }, [api, isGalleryOpen, galleryStartIndex]);

  const openGallery = (index: number) => {
    setGalleryStartIndex(index);
    setIsGalleryOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
        <p className="text-muted-foreground animate-pulse">Loading property details...</p>
      </div>
    );
  }

  if (isError || !property) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="bg-destructive/10 p-6 rounded-full">
          <Info className="h-12 w-12 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Property Not Found</h1>
          <p className="text-muted-foreground max-w-md">
            We couldn't find the property you're looking for. It might have been unlisted or the
            link is broken.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to={basePath}>Return to browsing</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mini Navbar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-ml-2 text-muted-foreground hover:text-foreground"
            >
              <Link to={basePath}>
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
        {/* Gallery Grid */}
        {/* Mobile Gallery Slider */}
        <div className="block sm:hidden mb-6 relative rounded-2xl overflow-hidden shadow-xl aspect-[4/3] bg-muted">
          {allImages.length > 0 ? (
            <Carousel setApi={setMobileApi} className="w-full h-full">
              <CarouselContent className="h-full -ml-0">
                {allImages.map((img, index) => (
                  <CarouselItem
                    key={index}
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

        {/* Desktop Gallery Grid */}
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
          {/* Main Info Column */}
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

            {/* Description */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">About this space</h2>
              <div
                className="prose prose-lg dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-a:text-accent prose-img:rounded-2xl"
                dangerouslySetInnerHTML={{
                  __html: property.descriptionHtml || "<p>No description provided.</p>",
                }}
              />
            </div>

            <Separator />

            {/* House Rules & Amenities (Visual enhancements) */}
            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-6">
                <h3 className="text-xl font-bold">House rules</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">Check-in: After 3:00 PM</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">Check-out: 11:00 AM</span>
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
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                    <span className="text-sm font-medium">Wifi</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                    <span className="text-sm font-medium">Kitchen</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                    <span className="text-sm font-medium">Free parking on premises</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                    <span className="text-sm font-medium">Air conditioning</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Widget Column */}
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
                {/* Date Selectors */}
                <div className="grid grid-cols-2 gap-px bg-border/50 border border-border rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-card p-3 space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Check-in
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-sm font-bold w-full text-left truncate hover:text-accent transition-colors">
                          {dateRange.from ? format(dateRange.from, "MMM d, yyyy") : "Add date"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRange.from}
                          onSelect={(d) => setDateRange((prev) => ({ ...prev, from: d }))}
                          disabled={(date) => isPast(date) && !isSameDay(date, new Date())}
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
                          {dateRange.to ? format(dateRange.to, "MMM d, yyyy") : "Add date"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={dateRange.to}
                          onSelect={(d) => setDateRange((prev) => ({ ...prev, to: d }))}
                          disabled={(date) => {
                            if (dateRange.from) {
                              return isBefore(date, addDays(dateRange.from, 1));
                            }
                            return isPast(date);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Availability Result */}
                {checkAvailabilityEnabled && (
                  <div
                    className={cn(
                      "p-4 rounded-xl border flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-2",
                      isCheckingAvailability
                        ? "bg-muted animate-pulse"
                        : availability?.isAvailable
                          ? "bg-accent/10 border-accent/20 text-accent"
                          : "bg-destructive/10 border-destructive/20 text-destructive"
                    )}
                  >
                    {isCheckingAvailability ? (
                      <Clock className="h-5 w-5 shrink-0 animate-spin" />
                    ) : availability?.isAvailable ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                    ) : (
                      <Info className="h-5 w-5 shrink-0" />
                    )}
                    <div className="space-y-1">
                      <p className="font-bold text-sm">
                        {isCheckingAvailability
                          ? "Checking..."
                          : availability?.isAvailable
                            ? "Available for your dates!"
                            : "Not available"}
                      </p>
                      {!isCheckingAvailability && availability && (
                        <p className="text-xs opacity-90 leading-snug">
                          {availability.isAvailable
                            ? "You can proceed to request a booking with the owner."
                            : "This property is blocked for some of the selected dates. Please try another range."}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  className="w-full h-14 rounded-xl text-lg font-bold shadow-lg shadow-accent/20 transition-all hover:shadow-accent/30 active:scale-[0.98]"
                  variant="accent"
                  disabled={!availability?.isAvailable || isCheckingAvailability}
                >
                  Request Booking
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  You won't be charged yet
                </p>
              </CardContent>
              <CardFooter className="bg-muted/30 p-4 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  <p>Booking is managed directly by the property owner through Corely Platform.</p>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>

      {/* Detail Footer */}
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
            <Button asChild variant="accent" size="sm">
              <a href="#">Contact Host</a>
            </Button>
          </div>
        </div>
      </footer>

      {/* Gallery Modal */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-w-screen-xl w-full h-[90vh] md:h-screen max-h-screen p-0 bg-background/95 border-none">
          <div className="relative w-full h-full flex flex-col">
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

            <div className="flex-1 flex items-center justify-center p-4 md:p-12 overflow-hidden">
              <Carousel setApi={setApi} className="w-full max-w-5xl">
                <CarouselContent>
                  {allImages.map((img, index) => (
                    <CarouselItem
                      key={index}
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
                  <CarouselPrevious />
                  <CarouselNext />
                </div>
              </Carousel>
            </div>

            <div className="absolute bottom-4 left-0 right-0 flex justify-center text-white/80 text-sm">
              {api && (
                <span>
                  {api.selectedScrollSnap() + 1} / {allImages.length}
                </span>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
