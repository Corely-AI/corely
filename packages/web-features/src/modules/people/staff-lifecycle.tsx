import { useCallback, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@corely/ui";
import type { StaffJourneyClient } from "./staff-journey-client";
import { staffJourneyCopy } from "./staff-journey-copy";
import { useStaffJourney } from "./use-staff-journey";
import { StaffOnboardingForm } from "./staff-onboarding-form";
import "./staff-journey.css";
export function StaffLifecycle({
  client,
  staffId,
  locale = "en",
}: {
  client: StaffJourneyClient;
  staffId: string;
  locale?: string;
}) {
  const t = staffJourneyCopy[locale === "de" || locale === "vi" ? locale : "en"];
  const load = useCallback(
    (signal: AbortSignal) => client.lifecycle(staffId, signal),
    [client, staffId]
  );
  const state = useStaffJourney(load),
    data = state.data;
  const [confirm, setConfirm] = useState(false),
    [disable, setDisable] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  async function command(kind: "onboarding" | "offboard", body: unknown) {
    if (
      await state.command(JSON.stringify([kind, staffId, body]), (key) =>
        client.lifecycleCommand(staffId, kind, body, key)
      )
    ) {
      setConfirm(false);
      setDisable(false);
      heading.current?.focus();
    }
  }
  return (
    <section className="staff-journey" aria-busy={state.loading || state.busy}>
      <Link to={`/people/staff/${encodeURIComponent(staffId)}`}>← {t.back}</Link>
      <header>
        <h1 ref={heading} tabIndex={-1}>
          {t.lifecycle}
        </h1>
        {data && (
          <p>
            {data.profile.displayName} · {data.profile.archivedAt ? t.archived : t.active}
          </p>
        )}
      </header>
      {state.notice && (
        <p role="status" className="staff-notice">
          {t.saved}
        </p>
      )}
      {state.error && (
        <div role="alert" className="staff-error">
          <p>{t[state.error]}</p>
          <Button
            className="staff-secondary"
            disabled={state.busy}
            onClick={() => {
              setConfirm(false);
              setDisable(false);
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
            {data.profile.archivedAt && <p className="staff-notice">{t.archivedHint}</p>}
            <article className="staff-card">
              <h2>{t.onboarding}</h2>
              {data.onboardingTask ? (
                <>
                  <p>
                    {data.onboardingTask.title} ·{" "}
                    {data.onboardingTask.checklist?.filter((s) => s.completed).length ?? 0}/
                    {data.onboardingTask.checklist?.length ?? 0} {t.progress}
                  </p>
                  <p className="staff-muted">{t.alreadyApproved}</p>
                  <Link to="/tasks">{t.work} →</Link>
                </>
              ) : !data.tasks.available ? (
                <p>{t.tasksUnavailable}</p>
              ) : !data.profile.archivedAt ? (
                <StaffOnboardingForm
                  version={data.profile.version}
                  t={t}
                  busy={state.busy}
                  onSave={(body) => void command("onboarding", body)}
                />
              ) : (
                <p>{t.noChecklist}</p>
              )}
            </article>
            <article className="staff-card">
              <h2>{t.departure}</h2>
              <p>{t.retained}</p>
              <h3>
                {t.openTasks}: {data.tasks.available ? data.tasks.openTaskCount : "—"}
              </h3>
              {!data.tasks.available ? (
                <p>{t.tasksUnavailable}</p>
              ) : (
                <>
                  {data.tasks.openTasks.length > 0 && (
                    <ul>
                      {data.tasks.openTasks.map((task) => (
                        <li key={task.id}>
                          {task.title}
                          {task.dueAt ? ` · ${new Date(task.dueAt).toLocaleString(locale)}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                  {data.tasks.openTaskCount > data.tasks.openTasks.length && (
                    <p>
                      {t.total}: {data.tasks.openTasks.length}/{data.tasks.openTaskCount}
                    </p>
                  )}
                  <Link to="/tasks">{t.work} →</Link>
                  <h3>{t.routines}</h3>
                  {data.tasks.recurringTemplates.length ? (
                    <ul>
                      {data.tasks.recurringTemplates.map((row) => (
                        <li key={row.id}>{row.title}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{t.none}</p>
                  )}
                </>
              )}
              <h3>
                {t.bookings}: {data.bookings.length}
              </h3>
              <p className="staff-muted">
                {t.localTimes}: {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </p>
              {data.bookings.length ? (
                <ul>
                  {data.bookings.map((booking) => (
                    <li key={`${booking.kind}:${booking.id}`}>
                      <time dateTime={booking.startAt}>
                        {new Date(booking.startAt).toLocaleString(locale)}
                      </time>{" "}
                      – {new Date(booking.endAt).toLocaleString(locale)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{t.none}</p>
              )}
              <h3>{t.access}</h3>
              <p>
                {
                  t[
                    data.access.status === "ACTIVE"
                      ? "active"
                      : data.access.status === "DISABLED"
                        ? "disabled"
                        : data.access.status === "INVITED"
                          ? "invited"
                          : data.access.status === "MISSING"
                            ? "missing"
                            : "unlinked"
                  ]
                }
              </p>
              <p className="staff-muted">{t.accessHint}</p>
              {(!data.profile.archivedAt || data.access.canDisable) &&
                (confirm ? (
                  <div className="staff-card" role="group" aria-label={t.departure}>
                    {data.access.canDisable && (
                      <label className="staff-check">
                        <input
                          type="checkbox"
                          checked={disable}
                          disabled={state.busy}
                          onChange={(e) => setDisable(e.target.checked)}
                        />
                        {t.disable}
                      </label>
                    )}
                    <div className="staff-actions">
                      <Button
                        className="staff-primary"
                        disabled={state.busy || (!!data.profile.archivedAt && !disable)}
                        onClick={() =>
                          void command("offboard", {
                            version: data.profile.version,
                            disableWorkspaceAccess: disable,
                          })
                        }
                      >
                        {data.profile.archivedAt ? t.followup : t.finalConfirm}
                      </Button>
                      <Button
                        className="staff-secondary"
                        disabled={state.busy}
                        onClick={() => {
                          setConfirm(false);
                          setDisable(false);
                        }}
                      >
                        {t.close}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="staff-secondary"
                    disabled={state.busy}
                    onClick={() => setConfirm(true)}
                  >
                    {data.profile.archivedAt ? t.followup : t.confirm}
                  </Button>
                ))}
            </article>
          </>
        )
      )}
    </section>
  );
}
