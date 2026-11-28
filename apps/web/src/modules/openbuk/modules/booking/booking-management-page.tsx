import { useEffect, useRef, useState } from "react";
import {
  OpenBukManageDetailsSchema,
  type OpenBukManageDetails,
  type OpenBukSlot,
} from "@corely/contracts";
import { json, publicApi } from "../../shared/api";
import { LanguageSwitch, useLanguage } from "../../shared/i18n";
import { Field, Loading, Logo, localDay, time } from "../../shared/ui";
import "../../styles/booking-management.css";

type View =
  | { state: "loading" | "unavailable" | "cancelled" }
  | { state: "ready"; appointment: OpenBukManageDetails };
type Mode = "details" | "move" | "cancel";
type CommandResult =
  | { status: "cancelled" }
  | { status: "moved"; appointment: OpenBukManageDetails };

function studioDay(startAt: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(startAt));
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type)?.value)
    .join("-");
}

export function BookingManagementPage({
  studioSlug,
  token,
}: {
  studioSlug: string;
  token: string;
}) {
  const { t, locale } = useLanguage();
  const [view, setView] = useState<View>({ state: "loading" });
  const [mode, setMode] = useState<Mode>("details");
  const [day, setDay] = useState("");
  const [slots, setSlots] = useState<OpenBukSlot[]>([]);
  const [selected, setSelected] = useState("");
  const [revision, setRevision] = useState(0);
  const [slotLoading, setSlotLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"slotConflict" | "requestFailed" | null>(null);
  const [moved, setMoved] = useState(false);
  const [copied, setCopied] = useState(false);
  const attempt = useRef<{ command: string; key: string } | null>(null);
  const appointment = view.state === "ready" ? view.appointment : null;

  useEffect(() => {
    const abort = new AbortController();
    void publicApi<unknown>(studioSlug, "manage", {
      ...json("POST", { token }),
      signal: abort.signal,
    })
      .then((response) => {
        if (!abort.signal.aborted) {
          setView({ state: "ready", appointment: OpenBukManageDetailsSchema.parse(response) });
        }
      })
      .catch(() => {
        if (!abort.signal.aborted) {
          setView({ state: "unavailable" });
        }
      });
    return () => abort.abort();
  }, [studioSlug, token]);

  useEffect(() => {
    if (mode !== "move" || !day) {
      return;
    }
    const abort = new AbortController();
    setSlotLoading(true);
    setSlots([]);
    void publicApi<{ slots: OpenBukSlot[] }>(studioSlug, "manage/availability", {
      ...json("POST", { token, day }),
      signal: abort.signal,
    })
      .then((response) => {
        if (!abort.signal.aborted) {
          setSlots(response.slots);
        }
      })
      .catch(() => {
        if (!abort.signal.aborted) {
          setError("requestFailed");
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) {
          setSlotLoading(false);
        }
      });
    return () => abort.abort();
  }, [mode, day, studioSlug, token, revision]);

  function change(next: Mode) {
    if (next === "move" && appointment) {
      setDay(studioDay(appointment.startAt, appointment.timezone));
    }
    setError(null);
    setSelected("");
    setMoved(false);
    setMode(next);
  }

  async function execute(action: "move" | "cancel") {
    if (
      !appointment ||
      pending ||
      (action === "move" && !slots.some(({ startAt }) => startAt === selected))
    ) {
      return;
    }
    const body = {
      token,
      version: appointment.version,
      ...(action === "move" ? { startAt: selected } : {}),
    };
    const command = `${action}:${JSON.stringify(body)}`;
    if (attempt.current?.command !== command) {
      attempt.current = { command, key: crypto.randomUUID() };
    }
    setPending(true);
    setError(null);
    try {
      const result = await publicApi<CommandResult>(studioSlug, `manage/${action}`, {
        ...json("POST", body),
        headers: { "Content-Type": "application/json", "Idempotency-Key": attempt.current.key },
      });
      setMode("details");
      setSelected("");
      if (result.status === "moved") {
        setView({ state: "ready", appointment: result.appointment });
        setMoved(true);
      } else {
        setView({ state: "cancelled" });
      }
    } catch (failure) {
      const conflict = failure instanceof Error && failure.message === "slotConflict";
      setError(conflict ? "slotConflict" : "requestFailed");
      if (conflict) {
        setRevision((value) => value + 1);
        try {
          const response = await publicApi<unknown>(studioSlug, "manage", json("POST", { token }));
          setView({ state: "ready", appointment: OpenBukManageDetailsSchema.parse(response) });
        } catch {
          setView({ state: "unavailable" });
        }
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
      <main className="booking-shell guest-management">
        <h1>{t("guestManage")}</h1>
        {view.state === "loading" && <Loading variant="calendar" />}
        {view.state === "unavailable" && (
          <p className="error" role="alert">
            {t("guestManageUnavailable")}
          </p>
        )}
        {view.state === "cancelled" && <p role="status">{t("guestManageCancelled")}</p>}
        {appointment && (
          <>
            <div className="guest-current">
              <h2>{appointment.serviceName}</h2>
              <p>
                {appointment.staffName} · {appointment.timezone}
              </p>
              <p>
                {studioDay(appointment.startAt, appointment.timezone)} ·{" "}
                {time(appointment.startAt, appointment.timezone, locale)}–
                {time(appointment.endAt, appointment.timezone, locale)}
              </p>
              <p className="muted">
                {t("reference")} {appointment.reference}
              </p>
            </div>
            {moved && <p role="status">{t("guestManageMoved")}</p>}
            {error && (
              <p className="error" role="alert">
                {t(error)}
              </p>
            )}
            {mode === "details" && (
              <div className="actions">
                {appointment.canMove && (
                  <button className="button" onClick={() => change("move")}>
                    {t("agendaMove")}
                  </button>
                )}
                <button className="button secondary" onClick={() => change("cancel")}>
                  {t("agendaCancel")}
                </button>
                <button
                  className="button secondary"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(window.location.href)
                      .then(() => setCopied(true))
                      .catch(() => setError("requestFailed"));
                  }}
                >
                  {t(copied ? "copied" : "guestManageCopy")}
                </button>
              </div>
            )}
            {mode === "cancel" && (
              <section className="guest-current" aria-labelledby="guest-cancel-title">
                <h2 id="guest-cancel-title">{t("agendaCancel")}</h2>
                <p>{t("guestCancelWarning")}</p>
                <div className="actions">
                  <button
                    className="button secondary"
                    disabled={pending}
                    onClick={() => change("details")}
                  >
                    {t("agendaBack")}
                  </button>
                  <button
                    className="button"
                    disabled={pending}
                    onClick={() => void execute("cancel")}
                  >
                    {t(pending ? "confirming" : "agendaConfirmCancel")}
                  </button>
                </div>
              </section>
            )}
            {mode === "move" && (
              <form
                className="guest-current"
                aria-labelledby="guest-move-title"
                onSubmit={(event) => {
                  event.preventDefault();
                  void execute("move");
                }}
              >
                <h2 id="guest-move-title">{t("agendaMove")}</h2>
                <Field label={`${t("date")} · ${appointment.timezone}`}>
                  <input
                    type="date"
                    value={day}
                    min={localDay(appointment.timezone)}
                    disabled={pending}
                    onChange={(event) => {
                      if (event.target.value) {
                        setDay(event.target.value);
                        setSelected("");
                        setError(null);
                      }
                    }}
                  />
                </Field>
                {slotLoading ? (
                  <Loading variant="calendar" />
                ) : slots.length ? (
                  <Field label={t("agendaNewTime")}>
                    <select
                      required
                      value={selected}
                      disabled={pending}
                      onChange={(event) => {
                        setSelected(event.target.value);
                        setError(null);
                      }}
                    >
                      <option value="">{t("agendaSelectTime")}</option>
                      {slots.map((slot) => (
                        <option key={slot.startAt} value={slot.startAt}>
                          {time(slot.startAt, appointment.timezone, locale)}–
                          {time(slot.endAt, appointment.timezone, locale)}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <p className="muted">{t("noSlots")}</p>
                )}
                <div className="actions">
                  <button
                    type="button"
                    className="button secondary"
                    disabled={pending}
                    onClick={() => change("details")}
                  >
                    {t("agendaBack")}
                  </button>
                  <button
                    className="button"
                    type="submit"
                    disabled={pending || !slots.some(({ startAt }) => startAt === selected)}
                  >
                    {t(pending ? "confirming" : "agendaConfirmMove")}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
