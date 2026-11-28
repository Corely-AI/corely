import {
  OpenBukTeamSchema,
  OpenBukTeamUpdateSchema,
  type OpenBukTeam,
  type OpenBukTeamUpdate,
} from "@corely/contracts";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { api, json } from "../../shared/api";
import { useLanguage } from "../../shared/i18n";
import { ErrorMessage, Field, Loading } from "../../shared/ui";

type TeamStaff = OpenBukTeamUpdate["staff"][number];
type TeamService = OpenBukTeamUpdate["services"][number];

export function TeamBookingSettings() {
  const { t } = useLanguage();
  const [team, setTeam] = useState<OpenBukTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const reload = () => {
    setLoading(true);
    setFailed(false);
    setSaved(false);
    setAttempt((value) => value + 1);
  };

  useEffect(() => {
    const controller = new AbortController();
    api
      .request<{ team: unknown }>("/openbuk/team", {}, { signal: controller.signal })
      .then(({ team }) => {
        if (!controller.signal.aborted) {
          setTeam(OpenBukTeamSchema.parse(team));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFailed(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [attempt]);

  return (
    <section className="team-booking-settings" aria-label={t("bookingTeam")}>
      <h2>{t("bookingTeam")}</h2>
      <p className="muted">{t("bookingTeamHelp")}</p>
      {loading ? (
        <Loading />
      ) : failed ? (
        <>
          <ErrorMessage />
          <button className="button secondary" type="button" onClick={reload}>
            {t("retry")}
          </button>
        </>
      ) : team ? (
        <TeamEditor
          key={team.revision ?? "initial"}
          team={team}
          reload={reload}
          onSaved={(next) => {
            setTeam(next);
            setSaved(true);
          }}
        />
      ) : null}
      {saved ? <p role="status">{t("teamSaved")}</p> : null}
    </section>
  );
}

function TeamEditor({
  team,
  reload,
  onSaved,
}: {
  team: OpenBukTeam;
  reload: () => void;
  onSaved: (team: OpenBukTeam) => void;
}) {
  const { t, locale } = useLanguage();
  const location = useLocation();
  const calendarUrl = location.pathname.replace(/\/settings$/, "/calendar");
  const [staff, setStaff] = useState<TeamStaff[]>(
    team.staff.map(({ futureCommitments: _futureCommitments, ...member }) => member)
  );
  const [services, setServices] = useState<TeamService[]>(
    team.services.map(({ futureCommitments: _futureCommitments, ...service }) => service)
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"invalidTeam" | "teamChanged" | "requestFailed" | null>(null);
  const attempt = useRef<{ fingerprint: string; id: string } | null>(null);

  const updateStaff = (id: string, changes: Partial<TeamStaff>) =>
    setStaff((items) => items.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  const updateService = (id: string, changes: Partial<TeamService>) =>
    setServices((items) => items.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  const commitment = (count: number) =>
    count > 0 ? (
      <p className="muted">
        {t("futureCommitments").replace("{count}", new Intl.NumberFormat(locale).format(count))}{" "}
        <Link className="text-button" to={calendarUrl}>
          {t("calendar")}
        </Link>
      </p>
    ) : null;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    setError(null);
    const data = new FormData(event.currentTarget);
    const command = {
      revision: team.revision,
      staff,
      services: services.map((service) => {
        const field = (name: string) => String(data.get(`${service.id}-${name}`) ?? "");
        return {
          ...service,
          durationMinutes: Number(field("duration")),
          priceCents: Math.round(Number(field("price")) * 100),
          bufferBeforeMinutes: Number(field("before")),
          bufferAfterMinutes: Number(field("after")),
        };
      }),
    };
    const fingerprint = JSON.stringify(command);
    if (attempt.current?.fingerprint !== fingerprint) {
      attempt.current = { fingerprint, id: crypto.randomUUID() };
    }
    const parsed = OpenBukTeamUpdateSchema.safeParse({ ...command, updateId: attempt.current.id });
    if (!parsed.success) {
      setError("invalidTeam");
      return;
    }
    setPending(true);
    try {
      const result = await api.request<{ team: unknown }>(
        "/openbuk/team",
        json("PUT", parsed.data)
      );
      onSaved(OpenBukTeamSchema.parse(result.team));
    } catch (cause) {
      setError(
        cause && typeof cause === "object" && "status" in cause && cause.status === 409
          ? "teamChanged"
          : "requestFailed"
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="setup-form" onSubmit={(event) => void save(event)}>
      <h3>{t("bookingStaff")}</h3>
      {staff.map((member) => (
        <fieldset key={member.id} disabled={pending}>
          <legend>{member.staffName.trim() || t("staffName")}</legend>
          <Field label={t("staffName")}>
            <input
              value={member.staffName}
              maxLength={120}
              required
              readOnly={member.id === team.primaryStaffId}
              onChange={(event) => updateStaff(member.id, { staffName: event.target.value })}
            />
          </Field>
          <label className="check-label">
            <input
              type="checkbox"
              checked={member.active}
              onChange={(event) => updateStaff(member.id, { active: event.target.checked })}
            />
            {t("acceptNewBookings")}
          </label>
          {commitment(
            team.staff.find((existing) => existing.id === member.id)?.futureCommitments ?? 0
          )}
          {member.create ? (
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setStaff((items) => items.filter((item) => item.id !== member.id));
                setServices((items) =>
                  items.map((item) => ({
                    ...item,
                    staffIds: item.staffIds.filter((id) => id !== member.id),
                  }))
                );
              }}
            >
              {t("remove")}
            </button>
          ) : null}
        </fieldset>
      ))}
      <button
        className="button secondary"
        type="button"
        disabled={pending || staff.length >= 30}
        onClick={() =>
          setStaff((items) => [
            ...items,
            { id: crypto.randomUUID(), create: true, staffName: "", active: true },
          ])
        }
      >
        {t("addBookingStaff")}
      </button>
      <h3>{t("bookableServices")}</h3>
      {services.map((service) => {
        const primary = service.id === team.primaryServiceId;
        return (
          <fieldset key={service.id} disabled={pending}>
            <legend>{service.serviceName.trim() || t("serviceName")}</legend>
            <div className="form-grid">
              <Field label={t("serviceName")}>
                <input
                  required
                  value={service.serviceName}
                  maxLength={120}
                  readOnly={primary}
                  onChange={(event) =>
                    updateService(service.id, { serviceName: event.target.value })
                  }
                />
              </Field>
              <Field label={t("duration")}>
                <input
                  name={`${service.id}-duration`}
                  type="number"
                  required
                  min={5}
                  max={480}
                  defaultValue={service.durationMinutes}
                  readOnly={primary}
                />
              </Field>
              <Field label={t("price")}>
                <input
                  name={`${service.id}-price`}
                  type="number"
                  required
                  min={0}
                  max={100000}
                  step={0.01}
                  defaultValue={(service.priceCents / 100).toFixed(2)}
                  readOnly={primary}
                />
              </Field>
              <Field label={t("bufferBefore")}>
                <input
                  name={`${service.id}-before`}
                  type="number"
                  required
                  min={0}
                  max={120}
                  defaultValue={service.bufferBeforeMinutes}
                  readOnly={primary}
                />
              </Field>
              <Field label={t("bufferAfter")}>
                <input
                  name={`${service.id}-after`}
                  type="number"
                  required
                  min={0}
                  max={120}
                  defaultValue={service.bufferAfterMinutes}
                  readOnly={primary}
                />
              </Field>
            </div>
            <div className="team-eligibility" role="group" aria-label={t("eligibleStaff")}>
              <strong>{t("eligibleStaff")}</strong>
              {staff.map((member) => (
                <label className="check-label" key={member.id}>
                  <input
                    type="checkbox"
                    checked={service.staffIds.includes(member.id)}
                    onChange={(event) =>
                      updateService(service.id, {
                        staffIds: event.target.checked
                          ? [...service.staffIds, member.id]
                          : service.staffIds.filter((id) => id !== member.id),
                      })
                    }
                  />
                  {member.staffName.trim() || t("staffName")}
                </label>
              ))}
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                checked={service.active}
                onChange={(event) => updateService(service.id, { active: event.target.checked })}
              />
              {t("acceptNewBookings")}
            </label>
            {commitment(
              team.services.find((existing) => existing.id === service.id)?.futureCommitments ?? 0
            )}
            {service.create ? (
              <button
                className="text-button"
                type="button"
                onClick={() =>
                  setServices((items) => items.filter((item) => item.id !== service.id))
                }
              >
                {t("remove")}
              </button>
            ) : null}
          </fieldset>
        );
      })}
      {error ? (
        <p className="error" role="alert">
          {t(error)}
        </p>
      ) : null}
      <div className="actions">
        <button
          className="button secondary"
          type="button"
          disabled={pending || services.length >= 60}
          onClick={() =>
            setServices((items) => [
              ...items,
              {
                id: crypto.randomUUID(),
                create: true,
                serviceName: "",
                durationMinutes: 45,
                priceCents: 0,
                bufferBeforeMinutes: 0,
                bufferAfterMinutes: 0,
                staffIds: [],
                active: true,
              },
            ])
          }
        >
          {t("addBookingService")}
        </button>
        <button className="button" type="submit" disabled={pending}>
          {t(pending ? "saving" : "saveTeam")}
        </button>
        {error === "teamChanged" ? (
          <button className="text-button" type="button" onClick={reload}>
            {t("retry")}
          </button>
        ) : null}
      </div>
    </form>
  );
}
