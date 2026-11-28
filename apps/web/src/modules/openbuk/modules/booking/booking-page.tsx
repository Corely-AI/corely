import { BookingConfirmation } from "@corely/booking-ui";
import { confirmationFooters } from "../../confirmation-extensions";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  normalizeCorelyLocale,
  type OpenBukPublicStudio,
  type OpenBukSlot,
  type OpenBukPublicBookResponse,
} from "@corely/contracts";
import { publicApi, json, BookingPolicyError } from "../../shared/api";
import { LanguageSwitch, useLanguage } from "../../shared/i18n";
import { Logo, Loading, ErrorMessage, Field, localDay, money, time } from "../../shared/ui";
import { BookingManagementPage } from "./booking-management-page";

export default function BookingPage() {
  const { studioSlug = "" } = useParams();
  const location = useLocation();
  const managementToken = new URLSearchParams(location.hash.slice(1)).get("manage");
  return managementToken === null ? (
    <BookingCheckout studioSlug={studioSlug} />
  ) : (
    <BookingManagementPage key={managementToken} studioSlug={studioSlug} token={managementToken} />
  );
}

function BookingCheckout({ studioSlug }: { studioSlug: string }) {
  const location = useLocation();
  const { t, locale, setLocale } = useLanguage();
  const [studio, setStudio] = useState<OpenBukPublicStudio | null>(null);
  const [slots, setSlots] = useState<OpenBukSlot[]>([]);
  const [day, setDay] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [slot, setSlot] = useState<OpenBukSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"requestFailed" | "slotConflict" | null>(null);
  const [policyRejection, setPolicyRejection] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState<OpenBukPublicBookResponse | null>(null);
  const [revision, setRevision] = useState(0);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const service = studio?.services?.find((item) => item.serviceId === serviceId) ?? studio;
  const staff =
    service && "staff" in service ? service.staff.find((item) => item.staffId === staffId) : studio;
  const timezone = staff?.timezone ?? studio?.timezone ?? "UTC";
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError(null);
    publicApi<{ studio: OpenBukPublicStudio }>(studioSlug, "studio", { signal: abort.signal })
      .then((r) => {
        if (!abort.signal.aborted) {
          setStudio(r.studio);
          setServiceId(r.studio.serviceId);
          setStaffId(r.studio.staffId);
          setDay(localDay(r.studio.timezone));
          const requestedLocale = normalizeCorelyLocale(
            new URLSearchParams(location.search).get("lang")
          );
          if (!requestedLocale && !localStorage.getItem("openbuk:locale")) {
            setLocale(r.studio.locale);
          }
        }
      })
      .catch(() => {
        if (!abort.signal.aborted) {
          setError("requestFailed");
          setLoading(false);
        }
      });
    return () => abort.abort();
  }, [studioSlug, setLocale]);
  useEffect(() => {
    if (!day || !studio || !serviceId || !staffId) {
      return;
    }
    const abort = new AbortController();
    setSlot(null);
    setPolicyRejection(null);
    setSlots([]);
    setLoading(true);
    const query = new URLSearchParams({ day, serviceId, staffId });
    publicApi<{ slots: OpenBukSlot[] }>(studioSlug, `availability?${query}`, {
      signal: abort.signal,
    })
      .then((r) => {
        if (!abort.signal.aborted) {
          setSlots(r.slots);
        }
      })
      .catch(() => {
        if (!abort.signal.aborted) {
          setError("requestFailed");
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) {
          setLoading(false);
        }
      });
    return () => abort.abort();
  }, [studio, studioSlug, day, revision, serviceId, staffId]);
  function selectPair(nextServiceId: string, nextStaffId: string) {
    const nextStaff = studio?.services
      ?.find((item) => item.serviceId === nextServiceId)
      ?.staff.find((item) => item.staffId === nextStaffId);
    if (!nextStaff) {
      return;
    }
    setSlot(null);
    setSlots([]);
    setLoading(true);
    setError(null);
    setServiceId(nextServiceId);
    setStaffId(nextStaffId);
    const firstDay = localDay(nextStaff.timezone);
    setDay((selectedDay) => (selectedDay < firstDay ? firstDay : selectedDay));
  }
  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studio || !slot || pending) {
      return;
    }
    setPending(true);
    setError(null);
    setPolicyRejection(null);
    const data = new FormData(event.currentTarget);
    const body = {
      serviceId,
      staffId,
      startAt: slot.startAt,
      customer: { name: String(data.get("name")), email: String(data.get("email")) },
      consentAccepted: true,
      locale,
      ...(data.has("confirmationEmailRequested") ? { confirmationEmailRequested: true } : {}),
    };
    const fingerprint = JSON.stringify(body);
    if (attempt.current?.fingerprint !== fingerprint) {
      attempt.current = { fingerprint, key: crypto.randomUUID() };
    }
    try {
      const result = await publicApi<OpenBukPublicBookResponse>(studioSlug, "bookings", {
        ...json("POST", body),
        headers: { "Content-Type": "application/json", "Idempotency-Key": attempt.current.key },
      });
      setConfirmation(result);
    } catch (e) {
      if (e instanceof BookingPolicyError) {
        setPolicyRejection(e.message);
        return;
      }
      const conflict = e instanceof Error && e.message === "slotConflict";
      setError(conflict ? "slotConflict" : "requestFailed");
      if (conflict) {
        attempt.current = null;
        setRevision((v) => v + 1);
      }
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="public-page">
      <header className="wrap">
        <Logo />
        <LanguageSwitch />
      </header>
      <main className="booking-shell">
        {!studio ? (
          loading ? (
            <Loading />
          ) : (
            <>
              <ErrorMessage />
              <button className="button" onClick={() => window.location.reload()}>
                {t("retry")}
              </button>
            </>
          )
        ) : confirmation ? (
          <>
            <BookingConfirmation
              studioName={studio.studioName}
              receipt={confirmation.receipt}
              locale={locale}
              labels={{
                success: t("success"),
                successBody: t("successBody"),
                withStaff: t("withStaff"),
                reference: t("reference"),
              }}
              formatTime={time}
              formatMoney={money}
              confirmationFooter={confirmationFooters.get(studio.slug)}
            />
            {confirmation.management && (
              <div className="guest-management-link">
                <Link
                  className="button"
                  to={{
                    pathname: location.pathname,
                    search: location.search,
                    hash: `manage=${confirmation.management.token}`,
                  }}
                >
                  {t("guestManage")}
                </Link>
                <p className="muted">{t("guestManagePrivate")}</p>
              </div>
            )}
          </>
        ) : service && staff ? (
          <>
            <div className="booking-banner">
              <span className="petal">✳</span>
              <p className="eyebrow">{studio.studioName}</p>
              <h1>{t("chooseTime")}</h1>
              <p>{t("bookingIntro")}</p>
            </div>
            <div className="booking-body">
              {studio.services ? (
                <div className="form-grid">
                  {studio.services.length > 1 ? (
                    <Field label={t("chooseService")}>
                      <select
                        value={serviceId}
                        disabled={pending}
                        onChange={(event) => {
                          const next = studio.services?.find(
                            (item) => item.serviceId === event.target.value
                          );
                          if (next) {
                            selectPair(next.serviceId, next.staff[0].staffId);
                          }
                        }}
                      >
                        {studio.services.map((item) => (
                          <option key={item.serviceId} value={item.serviceId}>
                            {item.serviceName}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : null}
                  {"staff" in service && service.staff.length > 1 ? (
                    <Field label={t("chooseBookingStaff")}>
                      <select
                        value={staffId}
                        disabled={pending}
                        onChange={(event) => selectPair(serviceId, event.target.value)}
                      >
                        {service.staff.map((item) => (
                          <option key={item.staffId} value={item.staffId}>
                            {item.staffName}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : null}
                </div>
              ) : null}
              <div className="selected-service">
                <div>
                  {(studio.services?.length ?? 0) <= 1 ? <h2>{service.serviceName}</h2> : null}
                  <p className="muted">
                    {service.durationMinutes} {t("minutes")}
                    {!("staff" in service) || service.staff.length === 1
                      ? ` · ${t("withStaff")} ${staff.staffName}`
                      : null}
                  </p>
                </div>
                <strong>{money(service.priceCents, service.currency, locale)}</strong>
              </div>
              <Field label={`${t("date")} · ${timezone}`}>
                <input
                  type="date"
                  value={day}
                  min={localDay(timezone)}
                  disabled={pending}
                  onChange={(e) => {
                    if (e.target.value) {
                      setDay(e.target.value);
                      setError(null);
                    }
                  }}
                />
              </Field>
              <h3>{t("available")}</h3>
              {loading ? (
                <Loading variant="calendar" />
              ) : slots.length === 0 ? (
                <p className="muted">{t("noSlots")}</p>
              ) : (
                <div className="slot-grid">
                  {slots.map((s) => (
                    <button
                      key={s.startAt}
                      type="button"
                      disabled={pending}
                      className={slot?.startAt === s.startAt ? "selected" : ""}
                      aria-pressed={slot?.startAt === s.startAt}
                      onClick={() => {
                        setSlot(s);
                        setError(null);
                      }}
                    >
                      {time(s.startAt, timezone, locale)}
                      <small>
                        {
                          new Intl.DateTimeFormat(locale, {
                            timeZone: timezone,
                            timeZoneName: "shortOffset",
                            hour: "2-digit",
                          })
                            .formatToParts(new Date(s.startAt))
                            .find((p) => p.type === "timeZoneName")?.value
                        }
                      </small>
                    </button>
                  ))}
                </div>
              )}
              {error ? <ErrorMessage message={error} /> : null}
              {policyRejection ? (
                <p className="error" role="alert">
                  {policyRejection}
                </p>
              ) : null}
              {slot ? (
                <form className="customer-form" onSubmit={(e) => void confirm(e)}>
                  <h2>{t("details")}</h2>
                  <Field label={t("customerName")}>
                    <input
                      name="name"
                      autoComplete="name"
                      required
                      maxLength={200}
                      disabled={pending}
                    />
                  </Field>
                  <Field label={t("email")}>
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      maxLength={320}
                      disabled={pending}
                    />
                  </Field>
                  <label className="check-label consent">
                    <input type="checkbox" name="consentAccepted" required disabled={pending} />
                    {t("consent")}
                  </label>
                  <label className="check-label confirmation-email-choice">
                    <input type="checkbox" name="confirmationEmailRequested" disabled={pending} />
                    {t("emailBookingConfirmation")}
                  </label>
                  <button className="button full" disabled={pending}>
                    {t(pending ? "confirming" : "confirm")} ↗
                  </button>
                </form>
              ) : null}
            </div>
          </>
        ) : null}
      </main>
      <p className="booking-footer">{t("promise")}</p>
    </div>
  );
}
