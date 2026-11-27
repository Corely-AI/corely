"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, UserRound } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Input,
  Label,
  Separator,
  Textarea,
} from "@/components/ui";
import {
  PublicConfirmBookingInputSchema,
  type CorelyLocale,
  type PublicBookingPage,
  type PublicBookingService,
  type PublicBookingStaff,
} from "@corely/contracts";
import { formatBookingDateTime, formatDuration, formatPrice } from "./public-booking-format";
import type { PublicBookingMessages } from "./public-booking-messages";
import { publicApi } from "@/lib/public-api";

const createClientId = (prefix: string): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function PublicBookingCheckoutClient({
  routeSlug,
  page,
  basePath,
  workspaceSlug,
  service,
  staff,
  startAt,
  endAt,
  resourceId,
  locale,
  copy,
}: {
  locale: CorelyLocale;
  copy: PublicBookingMessages;
  routeSlug: string;
  page: PublicBookingPage;
  basePath: string;
  workspaceSlug?: string | null;
  service: PublicBookingService;
  staff?: PublicBookingStaff | null;
  startAt: string;
  endAt: string;
  resourceId: string;
}) {
  const router = useRouter();
  const normalizedBase = basePath.replace(/\/$/, "");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  const [holdId, setHoldId] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [holdLoading, setHoldLoading] = useState(true);
  const [holdError, setHoldError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const holdIdempotencyKey = useRef(createClientId("public-booking-hold"));
  const confirmIdempotencyKey = useRef(createClientId("public-booking-confirm"));

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const effectiveRemainingSeconds = useMemo(() => {
    if (!holdExpiresAt) {
      return null;
    }
    const deltaMs = new Date(holdExpiresAt).getTime() - nowMs;
    return Math.max(0, Math.floor(deltaMs / 1000));
  }, [holdExpiresAt, nowMs]);

  const holdExpired = effectiveRemainingSeconds !== null && effectiveRemainingSeconds <= 0;

  const remainingLabel = useMemo(() => {
    if (effectiveRemainingSeconds === null) {
      return null;
    }
    const minutes = Math.floor(effectiveRemainingSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (effectiveRemainingSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [effectiveRemainingSeconds]);

  const createHold = useCallback(async () => {
    setHoldLoading(true);
    setHoldError(null);

    try {
      const response = await publicApi.createPublicBookingHold(
        routeSlug,
        {
          serviceId: service.id,
          startAt,
          endAt,
          staffId: staff?.id,
          resourceId,
          ttlSeconds: 600,
        },
        {
          workspaceSlug: workspaceSlug ?? null,
          headers: {
            "idempotency-key": holdIdempotencyKey.current,
          },
        }
      );

      setHoldId(response.hold.id);
      setHoldExpiresAt(response.hold.expiresAt);
    } catch {
      setHoldError(copy.reserveFailed);
      setHoldId(null);
      setHoldExpiresAt(null);
    } finally {
      setHoldLoading(false);
    }
  }, [endAt, resourceId, routeSlug, service.id, staff?.id, startAt, workspaceSlug]);

  useEffect(() => {
    void createHold();
  }, [createHold]);

  const onConfirm = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    if (!holdId) {
      setSubmitError(copy.slotNotReserved);
      return;
    }

    if (holdExpired) {
      setSubmitError(copy.reservationExpired);
      return;
    }

    const payload = {
      holdId,
      customer: {
        firstName,
        lastName,
        email,
        phone: phone || undefined,
      },
      notes: notes || undefined,
      marketingConsent,
      consentAccepted: consentAccepted as true,
      idempotencyKey: confirmIdempotencyKey.current,
    };

    const parsed = PublicConfirmBookingInputSchema.safeParse(payload);
    if (!parsed.success) {
      setSubmitError(copy.requiredFields);
      return;
    }

    setSubmitting(true);
    try {
      const response = await publicApi.confirmPublicBooking(routeSlug, parsed.data, {
        workspaceSlug: workspaceSlug ?? null,
        headers: {
          "idempotency-key": confirmIdempotencyKey.current,
        },
      });

      router.push(`${normalizedBase}/${routeSlug}/success/${response.booking.id}?lang=${locale}`);
    } catch {
      setSubmitError(copy.confirmFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div lang={locale} className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">
            {copy.checkout}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">{copy.confirmAppointment}</h1>
        </div>
        <Button asChild variant="outline">
          <Link href={`${normalizedBase}/${routeSlug}?lang=${locale}`}>{copy.backToTime}</Link>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold">{copy.yourDetails}</h2>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={onConfirm}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{copy.firstName}</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{copy.lastName}</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">{copy.email}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{copy.phone}</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">{copy.notes}</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                <p className="font-semibold">{copy.cancellationPolicy}</p>
                <p className="mt-1 text-muted-foreground">
                  {page.cancellationPolicyText ?? copy.checkoutCancelBefore}
                </p>
                {typeof page.cancellationCutoffHours === "number" ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cutoff: {page.cancellationCutoffHours} hours before start time.
                  </p>
                ) : null}
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={consentAccepted}
                    onCheckedChange={(value) => setConsentAccepted(Boolean(value))}
                  />
                  <span>{copy.agree}</span>
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={marketingConsent}
                    onCheckedChange={(value) => setMarketingConsent(Boolean(value))}
                  />
                  <span>{copy.promotions}</span>
                </label>
              </div>

              {submitError ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {submitError}
                </p>
              ) : null}

              <Button
                type="submit"
                className="w-full"
                variant="accent"
                data-testid="booking-confirm"
                disabled={
                  submitting ||
                  holdLoading ||
                  !holdId ||
                  holdExpired ||
                  !consentAccepted ||
                  !firstName ||
                  !lastName ||
                  !email
                }
              >
                {submitting ? copy.confirming : copy.confirmBooking}
              </Button>
            </form>
          </CardContent>
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-bold">{copy.bookingSummary}</h2>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="font-semibold">{service.name}</p>
              <p className="text-muted-foreground">{formatDuration(service.durationMinutes)}</p>
              <p className="font-semibold">{formatPrice(service, locale, copy.priceOnRequest)}</p>

              <Separator />

              <p className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                {formatBookingDateTime(startAt, locale)}
              </p>
              <p className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-muted-foreground" />
                {formatBookingDateTime(startAt, locale)} - {formatBookingDateTime(endAt, locale)}
              </p>
              <p className="inline-flex items-center gap-2">
                <UserRound className="h-4 w-4 text-muted-foreground" />
                {staff?.name ?? copy.firstAvailableStaff}
              </p>

              <Separator />

              <p className="font-medium">{page.venueName}</p>
              {page.address?.line1 ? (
                <p className="text-muted-foreground">{page.address.line1}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4">
              {holdLoading ? (
                <p className="text-sm text-muted-foreground">{copy.reserving}</p>
              ) : holdError ? (
                <p className="inline-flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  {holdError}
                </p>
              ) : holdExpired ? (
                <p className="inline-flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  {copy.holdExpired}
                </p>
              ) : (
                <>
                  <p className="inline-flex items-center gap-2 text-sm text-accent">
                    <CheckCircle2 className="h-4 w-4" />
                    {copy.slotReserved}
                  </p>
                  {remainingLabel && (
                    <Badge variant="outline">
                      {copy.expires.replace("{{time}}", remainingLabel)}
                    </Badge>
                  )}
                </>
              )}

              <Button asChild variant="outline" className="w-full">
                <Link href={`${normalizedBase}/${routeSlug}?lang=${locale}`}>{copy.refresh}</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
