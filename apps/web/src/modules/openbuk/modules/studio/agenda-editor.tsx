import { useRef, useState, type FormEvent } from "react";
import type { OpenBukAppointment, OpenBukReplacement } from "@corely/contracts";
import { api } from "../../shared/api";
import { useLanguage } from "../../shared/i18n";
import { Field, Loading, time } from "../../shared/ui";
import { agendaCommand, agendaErrorStatus, useAgenda } from "./agenda-client";

type Selection = { serviceId: string; staffId: string };
export type AgendaAction =
  | { kind: "create"; day: string; selection: Selection }
  | { kind: "move"; appointment: OpenBukAppointment }
  | { kind: "cancel"; appointment: OpenBukAppointment };

type EditorProps = {
  workspaceId: string;
  timezone: string;
  action: AgendaAction;
  onClose: (changed?: boolean) => void;
  onConflict: () => void;
};

export function AgendaEditor(props: EditorProps) {
  if (props.action.kind === "cancel") {
    return <CancelEditor {...props} appointment={props.action.appointment} />;
  }
  const appointment = props.action.kind === "move" ? props.action.appointment : null;
  const selection =
    props.action.kind === "create"
      ? props.action.selection
      : {
          serviceId: appointment?.serviceId ?? "",
          staffId: appointment?.staffId ?? "",
        };
  const day =
    props.action.kind === "create"
      ? props.action.day
      : localDate(props.action.appointment.startAt, props.timezone);
  return <SlotEditor {...props} appointment={appointment} initialDay={day} selection={selection} />;
}

function localDate(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type)?.value)
    .join("-");
}

function CancelEditor({
  workspaceId,
  appointment,
  timezone,
  onClose,
  onConflict,
}: EditorProps & { appointment: OpenBukAppointment }) {
  const { t, locale } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"conflict" | "failed" | null>(null);
  async function confirm() {
    if (busy || !appointment.version) {return;}
    setBusy(true);
    setError(null);
    try {
      await agendaCommand(workspaceId, "agenda/cancellations", {
        bookingId: appointment.id,
        version: appointment.version,
      });
      onClose(true);
    } catch (failure) {
      const stale = agendaErrorStatus(failure) === 409;
      setError(stale ? "conflict" : "failed");
      if (stale) {onConflict();}
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="agenda-editor" aria-labelledby="agenda-cancel-title">
      <h2 id="agenda-cancel-title">{t("agendaCancel")}</h2>
      <p>
        <strong>{appointment.customerName || appointment.reference}</strong> ·{" "}
        {time(appointment.startAt, timezone, locale)} · {appointment.serviceName}
      </p>
      <p>{t("agendaCancelWarning")}</p>
      {error && (
        <p className="error" role="alert">
          {t(error === "conflict" ? "agendaConflict" : "requestFailed")}
        </p>
      )}
      <div className="actions">
        <button autoFocus className="button secondary" disabled={busy} onClick={() => onClose()}>
          {t("agendaBack")}
        </button>
        <button
          className="button"
          disabled={busy || error === "conflict"}
          onClick={() => void confirm()}
        >
          {t(busy ? "confirming" : "agendaConfirmCancel")}
        </button>
      </div>
    </section>
  );
}

function SlotEditor({
  workspaceId,
  appointment,
  initialDay,
  selection,
  timezone,
  onClose,
  onConflict,
}: EditorProps & {
  appointment: OpenBukAppointment | null;
  initialDay: string;
  selection: Selection;
}) {
  const { t, locale } = useLanguage();
  const [day, setDay] = useState(initialDay);
  const [start, setStart] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [preview, setPreview] = useState<OpenBukReplacement | null>(null);
  const [error, setError] = useState<"conflict" | "failed" | null>(null);
  const [busy, setBusy] = useState(false);
  const mutation = useRef<{ body: string; key: string } | null>(null);
  const { data, phase, refresh } = useAgenda(workspaceId, { day, span: "day", ...selection });
  const validPair =
    data?.selection?.serviceId === selection.serviceId &&
    data.selection.staffId === selection.staffId;
  const service = data?.services.find((item) => item.serviceId === selection.serviceId);
  const staff = service?.staff.find((item) => item.staffId === selection.staffId);
  const slots =
    phase === "ready" && validPair && data?.days[0]?.day === day ? data.days[0].slots : [];
  const selectedSlot = slots.find((slot) => slot.startAt === start);

  function send<T>(path: string, body: unknown) {
    const fingerprint = JSON.stringify(body);
    if (mutation.current?.body !== fingerprint) {
      mutation.current = { body: fingerprint, key: api.generateIdempotencyKey() };
    }
    return agendaCommand<T>(workspaceId, path, body, mutation.current.key);
  }

  function stale() {
    setError("conflict");
    setPreview(null);
    refresh();
    onConflict();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || (!selectedSlot && !preview)) {return;}
    setError(null);
    setBusy(true);
    try {
      if (appointment && !preview) {
        const result = await agendaCommand<OpenBukReplacement>(
          workspaceId,
          "booking-changes/preview",
          { bookingId: appointment.id, startAt: start }
        );
        if (result.version !== appointment.version) {
          stale();
        } else {
          setPreview(result);
        }
        return;
      }
      if (preview) {
        await send("booking-changes/apply", preview);
      } else {
        await send("agenda/bookings", { ...selection, startAt: start, customer: { name, email } });
      }
      onClose(true);
    } catch (failure) {
      const status = agendaErrorStatus(failure);
      if (status === 409 || status === 404) {stale();}
      else {setError("failed");}
    } finally {
      setBusy(false);
    }
  }

  const slotZone = staff?.timezone ?? timezone;
  const showTime = (value: string) => time(value, slotZone, locale);
  return (
    <form
      className="agenda-editor"
      aria-labelledby="agenda-editor-title"
      onSubmit={(event) => void submit(event)}
    >
      <h2 id="agenda-editor-title">{t(appointment ? "agendaMove" : "agendaCreate")}</h2>
      {appointment && <p>{appointment.customerName || appointment.reference}</p>}
      <p className="muted">
        {[service?.serviceName, staff?.staffName, slotZone].filter(Boolean).join(" · ")}
      </p>
      {preview ? (
        <dl className="agenda-review" aria-label={t("agendaReview")}>
          <dt>{t("agendaCurrent")}</dt>
          <dd>
            {localDate(preview.current.startAt, slotZone)} · {showTime(preview.current.startAt)}–
            {showTime(preview.current.endAt)}
          </dd>
          <dt>{t("agendaNewTime")}</dt>
          <dd>
            {localDate(preview.replacement.startAt, slotZone)} ·{" "}
            {showTime(preview.replacement.startAt)}–{showTime(preview.replacement.endAt)}
          </dd>
        </dl>
      ) : (
        <>
          <div className="agenda-filters">
            <Field label={t("date")}>
              <input
                autoFocus
                type="date"
                value={day}
                disabled={busy}
                onChange={(e) => {
                  if (e.target.value) {
                    setDay(e.target.value);
                    setStart("");
                    setError(null);
                  }
                }}
              />
            </Field>
            <Field label={t("available")}>
              <select
                required
                value={selectedSlot ? start : ""}
                disabled={busy || !slots.length}
                onChange={(e) => {
                  setStart(e.target.value);
                  setError(null);
                }}
              >
                <option value="">{t("agendaSelectTime")}</option>
                {slots.map((slot) => (
                  <option key={slot.startAt} value={slot.startAt}>
                    {showTime(slot.startAt)}–{showTime(slot.endAt)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {phase === "loading" && <Loading variant="calendar" />}
          {phase === "error" && (
            <div className="actions">
              <p>{t("requestFailed")}</p>
              <button type="button" className="button secondary small" onClick={refresh}>
                {t("retry")}
              </button>
            </div>
          )}
          {phase === "denied" && (
            <p className="error" role="alert">
              {t("staffAccess")}
            </p>
          )}
          {phase === "ready" && !slots.length && <p className="muted">{t("noSlots")}</p>}
          {!appointment && (
            <fieldset disabled={busy} className="agenda-guest">
              <legend>{t("agendaGuest")}</legend>
              <p className="muted">{t("agendaGuestHelp")}</p>
              <div className="agenda-filters">
                <Field label={t("customerName")}>
                  <input
                    required
                    maxLength={200}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field label={t("email")}>
                  <input
                    required
                    type="email"
                    maxLength={320}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
              </div>
            </fieldset>
          )}
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {t(error === "conflict" ? "agendaConflict" : "requestFailed")}
        </p>
      )}
      <div className="actions">
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => (preview ? setPreview(null) : onClose())}
        >
          {t("agendaBack")}
        </button>
        <button className="button" type="submit" disabled={busy || (!preview && !selectedSlot)}>
          {t(
            busy
              ? "confirming"
              : preview
                ? "agendaConfirmMove"
                : appointment
                  ? "agendaReview"
                  : "confirm"
          )}
        </button>
      </div>
    </form>
  );
}
