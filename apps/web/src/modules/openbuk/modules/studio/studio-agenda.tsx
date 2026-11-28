import { useState, useRef } from "react";
import type { OpenBukAgendaQuery, OpenBukAppointment, OpenBukStudio } from "@corely/contracts";
import { useLanguage } from "../../shared/i18n";
import { Field, Loading, localDay, time } from "../../shared/ui";
import { offsetAgendaDay, useAgenda } from "./agenda-client";
import { AgendaEditor, type AgendaAction } from "./agenda-editor";
import "../../styles/agenda.css";

export function StudioAgenda({
  workspaceId,
  studio,
  showWeek,
}: {
  workspaceId: string;
  studio: OpenBukStudio;
  showWeek: boolean;
}) {
  const { t, locale } = useLanguage();
  const [query, setQuery] = useState<OpenBukAgendaQuery>(() => ({
    day: localDay(studio.timezone),
    span: showWeek ? "week" : "day",
  }));
  const [action, setAction] = useState<AgendaAction | null>(null);
  const [saved, setSaved] = useState(false);
  const opener = useRef<HTMLButtonElement | null>(null);
  const toolbar = useRef<HTMLButtonElement | null>(null);
  const { phase, data, dataMatchesQuery, refresh } = useAgenda(workspaceId, query);
  const selection = data?.selection;
  const service = data?.services.find((item) => item.serviceId === selection?.serviceId);
  const staff = service?.staff.find((item) => item.staffId === selection?.staffId);
  const ready = phase === "ready";
  const visibleDays = dataMatchesQuery ? (data?.days ?? []) : [];
  const labelDay = (day: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "full",
      timeZone: "UTC",
    }).format(new Date(`${day}T12:00:00Z`));

  function open(next: AgendaAction, button: HTMLButtonElement) {
    opener.current = button;
    setSaved(false);
    setAction(next);
  }

  function close(changed = false) {
    setAction(null);
    if (changed) {
      setSaved(true);
      refresh();
    }
    requestAnimationFrame(() => {
      const target = opener.current?.isConnected ? opener.current : toolbar.current;
      target?.focus();
    });
  }

  function card(appointment: OpenBukAppointment) {
    const cancellable =
      ["DRAFT", "CONFIRMED", "HOLD"].includes(appointment.status) && appointment.version;
    const movable =
      appointment.status === "CONFIRMED" &&
      appointment.serviceId &&
      appointment.staffId &&
      data?.services.some(
        (item) =>
          item.serviceId === appointment.serviceId &&
          item.staff.some((member) => member.staffId === appointment.staffId)
      ) &&
      Date.parse(appointment.startAt) > Date.now();
    return (
      <article key={appointment.id} className="appointment agenda-appointment">
        <div className="appointment-time">
          <strong>{time(appointment.startAt, data?.timezone ?? studio.timezone, locale)}</strong>
          <small>{time(appointment.endAt, data?.timezone ?? studio.timezone, locale)}</small>
        </div>
        <div className="appointment-person">
          <h3>{appointment.customerName || appointment.reference}</h3>
          <p>{[appointment.serviceName, appointment.staffName].filter(Boolean).join(" · ")}</p>
        </div>
        <span className="badge">
          {appointment.status === "CANCELLED"
            ? t("cancelled")
            : appointment.status === "NO_SHOW"
              ? t("noShow")
              : appointment.status === "COMPLETED"
                ? t("completed")
                : appointment.status === "CONFIRMED"
                  ? t("confirmed")
                  : appointment.status}
        </span>
        {ready && !action && (cancellable || movable) && (
          <div className="actions agenda-row-actions">
            {movable && (
              <button
                className="button secondary small"
                onClick={(e) => open({ kind: "move", appointment }, e.currentTarget)}
              >
                {t("agendaMove")}
              </button>
            )}
            {cancellable && (
              <button
                className="button secondary small"
                onClick={(e) => open({ kind: "cancel", appointment }, e.currentTarget)}
              >
                {t("agendaCancel")}
              </button>
            )}
          </div>
        )}
      </article>
    );
  }

  const step = query.span === "week" ? 7 : 1;
  return (
    <section className="studio-agenda" aria-label={t("calendar")}>
      <div className="agenda-toolbar">
        <div className="agenda-range">
          <button
            type="button"
            className="button secondary small"
            onClick={() => setQuery({ ...query, day: offsetAgendaDay(query.day, -step) })}
            aria-label={t("agendaPrevious")}
          >
            ‹
          </button>
          <Field label={t("date")}>
            <input
              type="date"
              value={query.day}
              onChange={(e) => e.target.value && setQuery({ ...query, day: e.target.value })}
            />
          </Field>
          <button
            type="button"
            className="button secondary small"
            onClick={() => setQuery({ ...query, day: offsetAgendaDay(query.day, step) })}
            aria-label={t("agendaNext")}
          >
            ›
          </button>
        </div>
        <div className="actions" aria-label={t("calendar")}>
          <button
            ref={toolbar}
            className={`button small${query.span === "day" ? "" : " secondary"}`}
            aria-pressed={query.span === "day"}
            onClick={() => setQuery({ ...query, span: "day" })}
          >
            {t("agendaDay")}
          </button>
          <button
            className={`button small${query.span === "week" ? "" : " secondary"}`}
            aria-pressed={query.span === "week"}
            onClick={() => setQuery({ ...query, span: "week" })}
          >
            {t("agendaWeek")}
          </button>
          <button
            className="button small"
            disabled={!ready || !selection || !!action}
            onClick={(e) => {
              if (selection?.serviceId && selection.staffId) {
                open(
                  {
                    kind: "create",
                    day: query.day,
                    selection: { serviceId: selection.serviceId, staffId: selection.staffId },
                  },
                  e.currentTarget
                );
              }
            }}
          >
            {t("agendaCreate")}
          </button>
        </div>
      </div>
      {service && selection && data && (
        <div className="agenda-filters">
          <Field label={t("chooseService")}>
            <select
              value={selection.serviceId}
              onChange={(e) => {
                const next = data.services.find((item) => item.serviceId === e.target.value);
                if (next?.staff[0])
                  {setQuery({ ...query, serviceId: next.serviceId, staffId: next.staff[0].staffId });}
              }}
            >
              {data.services.map((item) => (
                <option key={item.serviceId} value={item.serviceId}>
                  {item.serviceName}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("chooseBookingStaff")}>
            <select
              value={selection.staffId}
              onChange={(e) =>
                setQuery({ ...query, serviceId: selection.serviceId, staffId: e.target.value })
              }
            >
              {service.staff.map((item) => (
                <option key={item.staffId} value={item.staffId}>
                  {item.staffName}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
      {phase === "denied" ? (
        <p className="error" role="alert">
          {t("staffAccess")}
        </p>
      ) : (
        <>
          {saved && <p role="status">{t("agendaSaved")}</p>}
          {action && (
            <AgendaEditor
              workspaceId={workspaceId}
              action={action}
              timezone={studio.timezone}
              onClose={close}
              onConflict={refresh}
            />
          )}
          {phase === "loading" && <Loading variant="calendar" />}
          {phase === "error" && (
            <div className="agenda-notice">
              <p className="error" role="alert">
                {t(visibleDays.length ? "agendaStale" : "requestFailed")}
              </p>
              <button className="button secondary small" onClick={refresh}>
                {t("retry")}
              </button>
            </div>
          )}
          {phase !== "loading" &&
            visibleDays.map((day) => (
              <section key={day.day} className="schedule agenda-day">
                <div className="schedule-header">
                  <h2>{labelDay(day.day)}</h2>
                  <span className="muted">{data?.timezone}</span>
                </div>
                {day.appointments.length ? (
                  <div className="appointments">{day.appointments.map(card)}</div>
                ) : (
                  <p className="agenda-empty muted">{t("empty")}</p>
                )}
                {staff && (
                  <details className="agenda-availability">
                    <summary>
                      {t("available")} · {staff.staffName} ({day.slots.length}) · {staff.timezone}
                    </summary>
                    {day.slots.length ? (
                      <p>
                        {day.slots
                          .map((slot) => time(slot.startAt, staff.timezone, locale))
                          .join(" · ")}
                      </p>
                    ) : (
                      <p className="muted">{t("noSlots")}</p>
                    )}
                  </details>
                )}
              </section>
            ))}
        </>
      )}
    </section>
  );
}
