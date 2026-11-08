import { useCallback, useRef, useState, useEffect, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button, Input } from "@corely/ui";
import type { StaffSelfView } from "@corely/contracts";
import type { StaffJourneyClient } from "./staff-journey-client";
import { staffJourneyCopy, type StaffJourneyCopy } from "./staff-journey-copy";
import { useStaffJourney } from "./use-staff-journey";
import "./staff-journey.css";
function SelfDetailsForm({
  data,
  t,
  busy,
  onSave,
  onCancel,
}: {
  data: StaffSelfView;
  t: StaffJourneyCopy;
  busy: boolean;
  onSave: (body: unknown) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(data.profile.displayName),
    [email, setEmail] = useState(data.contacts.personalEmail ?? ""),
    [phone, setPhone] = useState(data.contacts.personalPhone ?? "");
  const nameInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    nameInput.current?.focus();
  }, []);
  function submit(event: FormEvent) {
    event.preventDefault();
    onSave({
      profileId: data.profile.id,
      displayName: name,
      personalEmail: email.trim() || null,
      personalPhone: phone.trim() || null,
      version: data.profile.version,
      contactsVersion: data.contacts.version,
    });
  }
  return (
    <form className="staff-card" onSubmit={submit}>
      <h2>{t.edit}</h2>
      <p className="staff-muted">{t.hint}</p>
      <label>
        {t.name}
        <Input
          ref={nameInput}
          required
          maxLength={160}
          value={name}
          disabled={busy}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className="staff-grid">
        <label>
          {t.email}
          <Input
            type="email"
            maxLength={254}
            value={email}
            disabled={busy}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          {t.phone}
          <Input
            type="tel"
            maxLength={80}
            value={phone}
            disabled={busy}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
      </div>
      <div className="staff-actions">
        <Button type="submit" className="staff-primary" disabled={busy || !name.trim()}>
          {t.save}
        </Button>
        <Button type="button" className="staff-secondary" disabled={busy} onClick={onCancel}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
export function StaffSelfService({
  client,
  locale = "en",
  tasksHref = "/tasks",
}: {
  client: StaffJourneyClient;
  locale?: string;
  tasksHref?: string;
}) {
  const t = staffJourneyCopy[locale === "de" || locale === "vi" ? locale : "en"];
  const load = useCallback((signal: AbortSignal) => client.self(signal), [client]);
  const state = useStaffJourney(load),
    data = state.data;
  const [editing, setEditing] = useState(false),
    heading = useRef<HTMLHeadingElement>(null);
  async function save(body: unknown) {
    if (await state.command(JSON.stringify(["self", body]), (key) => client.saveSelf(body, key))) {
      setEditing(false);
      heading.current?.focus();
    }
  }
  return (
    <section className="staff-journey" aria-busy={state.loading || state.busy}>
      <header>
        <h1 ref={heading} tabIndex={-1}>
          {t.title}
        </h1>
        <p>{t.intro}</p>
      </header>
      {state.notice && (
        <p className="staff-notice" role="status">
          {t.saved}
        </p>
      )}
      {state.error && (
        <div className="staff-error" role="alert">
          <p>{t[state.error]}</p>
          <Button
            className="staff-secondary"
            disabled={state.busy}
            onClick={() => {
              setEditing(false);
              state.reload();
            }}
          >
            {t.retry}
          </Button>
        </div>
      )}
      {state.loading ? (
        <p role="status">{t.loading}</p>
      ) : (
        data && (
          <>
            {editing ? (
              <SelfDetailsForm
                data={data}
                t={t}
                busy={state.busy}
                onSave={(body) => void save(body)}
                onCancel={() => {
                  setEditing(false);
                  heading.current?.focus();
                }}
              />
            ) : (
              <article className="staff-card">
                <h2>{data.profile.displayName}</h2>
                <dl className="staff-grid">
                  {[
                    [t.job, data.profile.jobTitle],
                    [t.team, data.profile.team],
                    [t.location, data.profile.location],
                    [t.email, data.contacts.personalEmail],
                    [t.phone, data.contacts.personalPhone],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="staff-muted">{label}</dt>
                      <dd>{value ?? t.unset}</dd>
                    </div>
                  ))}
                </dl>
                <p className="staff-muted">{t.hint}</p>
                {data.canEdit && (
                  <Button
                    className="staff-primary"
                    disabled={state.busy}
                    onClick={() => setEditing(true)}
                  >
                    {t.edit}
                  </Button>
                )}
              </article>
            )}
            <article className="staff-card">
              <h2>{t.onboarding}</h2>
              {!data.tasksAvailable ? (
                <p>{t.tasksUnavailable}</p>
              ) : data.onboardingTask ? (
                <>
                  <h3>{data.onboardingTask.title}</h3>
                  <p>
                    {data.onboardingTask.checklist?.filter((step) => step.completed).length ?? 0}/
                    {data.onboardingTask.checklist?.length ?? 0} {t.progress}
                  </p>
                  <ol>
                    {data.onboardingTask.checklist?.map((step) => (
                      <li key={step.id}>
                        {step.completed ? "✓ " : ""}
                        {step.title}
                      </li>
                    ))}
                  </ol>
                  <Link to={tasksHref}>{t.work} →</Link>
                </>
              ) : (
                <p>{t.noChecklist}</p>
              )}
            </article>
            <article className="staff-card">
              <h2>{t.availability}</h2>
              <p className="staff-muted">{t.schedules}</p>
              {!data.availability.plans.length ? (
                <p>{t.noPattern}</p>
              ) : (
                [...data.availability.plans]
                  .reverse()
                  .slice(0, 5)
                  .map((plan) => (
                    <details key={plan.revision}>
                      <summary>
                        {t.from} {plan.pattern.effectiveFrom} · {plan.pattern.timezone}
                      </summary>
                      {plan.pattern.effectiveUntil && (
                        <p>
                          {t.until}: {plan.pattern.effectiveUntil}
                        </p>
                      )}
                      {!plan.pattern.weeklyHours.length ? (
                        <p>{t.closed}</p>
                      ) : (
                        <ul>
                          {plan.pattern.weeklyHours.map((hours, index) => (
                            <li key={index}>
                              {new Intl.DateTimeFormat(locale, {
                                weekday: "long",
                                timeZone: "UTC",
                              }).format(new Date(Date.UTC(2026, 10, 8 + hours.dayOfWeek)))}{" "}
                              {hours.startTime}–{hours.endTime}
                            </li>
                          ))}
                        </ul>
                      )}
                      {plan.pattern.exceptions.length > 0 && (
                        <>
                          <h3>{t.exceptions}</h3>
                          <ul>
                            {plan.pattern.exceptions.map((date) => (
                              <li key={date.date}>
                                {date.date}:{" "}
                                {date.windows.length
                                  ? date.windows
                                      .map((w) => `${w.startTime}–${w.endTime}`)
                                      .join(", ")
                                  : t.closed}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </details>
                  ))
              )}
            </article>
          </>
        )
      )}
    </section>
  );
}
