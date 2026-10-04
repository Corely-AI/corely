import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import type { OpenBukPublicStudio, OpenBukSlot, OpenBukReceipt } from "@corely/contracts";
import { publicApi, json } from "../../shared/api";
import { LanguageSwitch, useLanguage } from "../../shared/i18n";
import { Logo, Loading, ErrorMessage, Field, localDay, money, time } from "../../shared/ui";
export default function BookingPage() {
  const { studioSlug = "" } = useParams();
  const { t, locale, setLocale } = useLanguage();
  const [studio, setStudio] = useState<OpenBukPublicStudio | null>(null);
  const [slots, setSlots] = useState<OpenBukSlot[]>([]);
  const [day, setDay] = useState("");
  const [slot, setSlot] = useState<OpenBukSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"requestFailed" | "slotConflict" | null>(null);
  const [pending, setPending] = useState(false);
  const [receipt, setReceipt] = useState<OpenBukReceipt | null>(null);
  const [revision, setRevision] = useState(0);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError(null);
    publicApi<{ studio: OpenBukPublicStudio }>(studioSlug, "studio", { signal: abort.signal })
      .then((r) => {
        if (!abort.signal.aborted) {
          setStudio(r.studio);
          setDay(localDay(r.studio.timezone));
          if (!localStorage.getItem("openbuk:locale")) {
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
    if (!day || !studio) {
      return;
    }
    const abort = new AbortController();
    setSlot(null);
    setSlots([]);
    setLoading(true);
    publicApi<{ slots: OpenBukSlot[] }>(studioSlug, `availability?day=${day}`, {
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
  }, [studio, studioSlug, day, revision]);
  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studio || !slot || pending) {
      return;
    }
    setPending(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const body = {
      serviceId: studio.serviceId,
      staffId: studio.staffId,
      startAt: slot.startAt,
      customer: { name: String(data.get("name")), email: String(data.get("email")) },
      consentAccepted: true,
    };
    const fingerprint = JSON.stringify(body);
    if (attempt.current?.fingerprint !== fingerprint) {
      attempt.current = { fingerprint, key: crypto.randomUUID() };
    }
    try {
      const result = await publicApi<{ receipt: OpenBukReceipt }>(studioSlug, "bookings", {
        ...json("POST", body),
        headers: { "Content-Type": "application/json", "Idempotency-Key": attempt.current.key },
      });
      setReceipt(result.receipt);
    } catch (e) {
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
        ) : receipt ? (
          <section className="confirmation">
            <span className="success-icon">✓</span>
            <p className="eyebrow">{studio.studioName}</p>
            <h1>{t("success")}</h1>
            <p className="muted">{t("successBody")}</p>
            <div className="receipt">
              <h2>{receipt.serviceName}</h2>
              <p>
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "full",
                  timeZone: receipt.timezone,
                }).format(new Date(receipt.startAt))}
              </p>
              <strong>
                {time(receipt.startAt, receipt.timezone, locale)} –{" "}
                {time(receipt.endAt, receipt.timezone, locale)}
              </strong>
              <p>
                {t("withStaff")} {receipt.staffName} · {receipt.timezone}
              </p>
              <p>{money(receipt.priceCents, receipt.currency, locale)}</p>
              <hr />
              <small>{t("reference")}</small>
              <p className="reference">{receipt.reference}</p>
            </div>
          </section>
        ) : (
          <>
            <div className="booking-banner">
              <span className="petal">✳</span>
              <p className="eyebrow">{studio.studioName}</p>
              <h1>{t("chooseTime")}</h1>
              <p>{t("bookingIntro")}</p>
            </div>
            <div className="booking-body">
              <div className="selected-service">
                <div>
                  <h2>{studio.serviceName}</h2>
                  <p className="muted">
                    {studio.durationMinutes} {t("minutes")} · {t("withStaff")} {studio.staffName}
                  </p>
                </div>
                <strong>{money(studio.priceCents, studio.currency, locale)}</strong>
              </div>
              <Field label={`${t("date")} · ${studio.timezone}`}>
                <input
                  type="date"
                  value={day}
                  min={localDay(studio.timezone)}
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
                <Loading />
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
                      {time(s.startAt, studio.timezone, locale)}
                      <small>
                        {
                          new Intl.DateTimeFormat(locale, {
                            timeZone: studio.timezone,
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
                    <input type="checkbox" required disabled={pending} />
                    {t("consent")}
                  </label>
                  <button className="button full" disabled={pending}>
                    {t(pending ? "confirming" : "confirm")} ↗
                  </button>
                </form>
              ) : null}
            </div>
          </>
        )}
      </main>
      <p className="booking-footer">{t("promise")}</p>
    </div>
  );
}
