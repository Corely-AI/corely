import { resolveCorelyLocale } from "@corely/contracts";
import { PeopleLink as Link } from "./people-runtime";
import { useState } from "react";

import { LoadingSkeleton, Button } from "@corely/ui";
import { availabilityCopy } from "./availability-copy";
import { usePeopleApi } from "./people-runtime";
import { usePeopleAccess, usePeopleLoad } from "./use-people";
import { StaffAvailabilityForm } from "./staff-availability-form";
export function StaffAvailability({ id, archived }: { id: string; archived: boolean }) {
  const peopleApi = usePeopleApi();
  const access = usePeopleAccess();
  const t = availabilityCopy[resolveCorelyLocale(access.locale)];
  const [saved, setSaved] = useState(false);
  const result = usePeopleLoad(
    (signal) => peopleApi.availability(id, signal),
    `${access.scope}:${id}`,
    access.can("profile.manage")
  );
  if (!access.can("profile.manage")) {
    return null;
  }
  const value = result.data;
  return (
    <section className="space-y-5 rounded-lg border bg-card p-5 sm:p-6" aria-label={t.title}>
      <h2 className="text-lg font-semibold">{t.title}</h2>
      <p className="text-sm text-muted-foreground">{t.intro}</p>
      {saved && <p role="status">{t.saved}</p>}
      {result.loading ? (
        <LoadingSkeleton variant="calendar" label={access.copy.loading} />
      ) : result.error ? (
        <div role="alert">
          <p>{t.error}</p>
          <Button variant="outline" onClick={result.reload}>
            {access.copy.retry}
          </Button>
        </div>
      ) : (
        value && (
          <>
            {!value.resourceId && <p className="rounded-md bg-muted p-3 text-sm">{t.unlinked}</p>}
            {!value.plans.length && <p className="font-medium">{t.empty}</p>}
            <div className="space-y-2 rounded-md bg-muted p-3 text-sm">
              <h3 className="font-medium">
                {t.impact} ({value.affectedCommitments.length})
              </h3>
              <p>{value.affectedCommitments.length ? t.review : t.clear}</p>
              <time className="block text-xs text-muted-foreground" dateTime={value.evaluatedAt}>
                {value.evaluatedAt}
              </time>
              <Button type="button" variant="outline" onClick={result.reload}>
                {t.reloadImpact}
              </Button>
              {value.affectedCommitments.map((c) => (
                <p key={`${c.kind}:${c.id}`} className="break-words">
                  {c.kind === "booking" ? (
                    <Link
                      className="underline"
                      to={`/booking/bookings/${encodeURIComponent(c.id)}`}
                    >
                      {c.id}
                    </Link>
                  ) : (
                    c.id
                  )}{" "}
                  · {c.startAt} → {c.endAt}
                </p>
              ))}
            </div>
            {value.affectedTasks && (
              <div className="space-y-2 rounded-md bg-muted p-3 text-sm">
                <h3 className="font-medium">{t.taskImpact}</h3>
                {value.affectedTasks.available ? (
                  value.affectedTasks.items.length ? (
                    <>
                      <Link className="underline" to="/tasks">
                        {t.reviewTasks}
                      </Link>
                      <ul>
                        {value.affectedTasks.items.map((task) => (
                          <li className="break-words" key={task.id}>
                            {task.title} ·{" "}
                            <time dateTime={task.dueAt}>
                              {new Date(task.dueAt).toLocaleString(access.locale, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </time>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p>{t.noTaskImpact}</p>
                  )
                ) : (
                  <p>{t.taskImpactUnavailable}</p>
                )}
              </div>
            )}
            {!archived && (
              <StaffAvailabilityForm
                key={`${access.scope}:${id}:${value.version}:${value.profileVersion}`}
                id={id}
                value={value}
                copy={t}
                onReload={() => {
                  setSaved(false);
                  result.reload();
                }}
                onSaved={() => {
                  setSaved(true);
                  result.reload();
                }}
              />
            )}
          </>
        )
      )}
    </section>
  );
}
