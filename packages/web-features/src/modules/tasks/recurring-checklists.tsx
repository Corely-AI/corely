import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Input } from "@corely/ui";
import type {
  ChecklistTemplateList,
  ChecklistTemplateView,
  PublishChecklist,
  TaskAssignee,
} from "@corely/contracts";
import type { ChecklistsClient } from "./checklists-client";
import type { TasksClient } from "./tasks-client";
import { checklistsCopy } from "./checklists-copy";
import { ChecklistForm } from "./checklist-form";
import "./tasks.css";
import "./checklists.css";
function statusOf(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error
    ? Number(error.status)
    : 0;
}
export function RecurringChecklists({
  client,
  tasksClient,
  locale = "en",
  backHref = "/tasks",
}: {
  client: ChecklistsClient;
  tasksClient: TasksClient;
  locale?: string;
  backHref?: string;
}) {
  const t = checklistsCopy[locale === "de" || locale === "vi" ? locale : "en"];
  const [data, setData] = useState<ChecklistTemplateList>();
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [editing, setEditing] = useState<ChecklistTemplateView | "new" | null>(null);
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const [error, setError] = useState<"error" | "failed" | "denied" | "conflict" | "">("");
  const [notice, setNotice] = useState(false),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const [confirmEnd, setConfirmEnd] = useState<string>();
  const [skipDates, setSkipDates] = useState<Record<string, string>>({});
  const keys = useRef(new Map<string, string>()),
    mounted = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setData(undefined);
    setAssignees([]);
    setError("");
    void Promise.all([
      client.list(page, controller.signal),
      tasksClient.assignees(controller.signal),
    ])
      .then(([result, people]) => {
        if (!controller.signal.aborted) {
          setData(result);
          setAssignees(people);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setError([401, 403, 404].includes(statusOf(error)) ? "denied" : "error");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [client, tasksClient, page, revision]);
  async function command(path: string, body: unknown) {
    const signature = JSON.stringify([path, body]);
    const key = keys.current.get(signature) ?? crypto.randomUUID();
    keys.current.set(signature, key);
    setBusy(true);
    setError("");
    setNotice(false);
    try {
      const saved = await client.command(path, body, key);
      keys.current.delete(signature);
      if (mounted.current) {
        setEditing(null);
        setConfirmEnd(undefined);
        setNotice(true);
        setData((current) =>
          current
            ? {
                ...current,
                items: current.items.some((row) => row.id === saved.id)
                  ? current.items.map((row) => (row.id === saved.id ? saved : row))
                  : [saved, ...current.items].slice(0, 10),
                total: current.total + (current.items.some((row) => row.id === saved.id) ? 0 : 1),
              }
            : current
        );
        headingRef.current?.focus();
      }
    } catch (error: unknown) {
      if (mounted.current) {
        const status = statusOf(error);
        if ([401, 403, 404].includes(status)) {
          setData(undefined);
          setAssignees([]);
          setEditing(null);
          setSkipDates({});
          setConfirmEnd(undefined);
          keys.current.clear();
        }
        setError(
          status === 409 ? "conflict" : [401, 403, 404].includes(status) ? "denied" : "failed"
        );
      }
    } finally {
      if (mounted.current) {
        setBusy(false);
      }
    }
  }
  function save(plan: PublishChecklist) {
    if (editing) {
      void command(
        editing === "new" ? "" : `/${editing.id}/edit`,
        editing === "new" ? plan : { version: editing.version, plan }
      );
    }
  }
  return (
    <section className="daily-work" aria-busy={busy || loading}>
      <Link className="checklist-back" to={backHref}>
        ← {t.back}
      </Link>
      <header className="task-heading">
        <div>
          <p className="task-eyebrow">{t.schedule}</p>
          <h1 ref={headingRef} tabIndex={-1}>
            {t.title}
          </h1>
          <p>{t.intro}</p>
        </div>
        {data && (
          <Button
            className="task-primary"
            disabled={busy || !!editing}
            onClick={() => {
              setEditing("new");
              setNotice(false);
            }}
          >
            {t.add}
          </Button>
        )}
      </header>
      {notice && (
        <p role="status" className="task-notice">
          {t.saved}
        </p>
      )}
      {error && (
        <div role="alert" className="task-error">
          <p>{t[error]}</p>
          <Button
            className="task-secondary"
            disabled={busy}
            onClick={() => {
              setEditing(null);
              setRevision((v) => v + 1);
            }}
          >
            {t.retry}
          </Button>
        </div>
      )}
      {editing && (
        <ChecklistForm
          key={editing === "new" ? "new" : editing.id}
          template={editing === "new" ? null : editing}
          assignees={assignees}
          busy={busy}
          locale={locale}
          t={t}
          onSave={save}
          onCancel={() => {
            setEditing(null);
            headingRef.current?.focus();
          }}
        />
      )}
      {loading ? (
        <p role="status">{t.loading}</p>
      ) : (
        data && (
          <>
            <aside className="checklist-policy">
              <p>{t.policy}</p>
              <p>{t.clock}</p>
            </aside>
            {data.items.length === 0 ? (
              <div className="task-empty">
                <h2>{t.empty}</h2>
                <p>{t.hint}</p>
              </div>
            ) : (
              <ul className="checklist-list">
                {data.items.map((row) => {
                  const plan = row.plans.at(-1);
                  if (!plan) {
                    return null;
                  }
                  return (
                    <li key={row.id}>
                      <article aria-label={plan.title} className="task-form">
                        <header>
                          <span
                            className={`task-status ${row.state === "ACTIVE" ? "is-completed" : ""}`}
                          >
                            {
                              t[
                                row.state === "ACTIVE"
                                  ? "active"
                                  : row.state === "PAUSED"
                                    ? "paused"
                                    : "ended"
                              ]
                            }
                          </span>
                          <h2>{plan.title}</h2>
                          <p className="task-muted">
                            {row.timezone} · {t.today}: {row.localToday} · {t.version} {row.version}
                          </p>
                        </header>
                        <p>
                          {plan.effectiveFrom} → {plan.effectiveUntil ?? "∞"} · {plan.dueTime} ·{" "}
                          {plan.weekdays
                            .map((day) =>
                              new Intl.DateTimeFormat(locale, {
                                weekday: "short",
                                timeZone: "UTC",
                              }).format(new Date(Date.UTC(2026, 10, 8 + day)))
                            )
                            .join(", ")}
                        </p>
                        <p>
                          {t.assignees}:{" "}
                          {plan.assigneeIds
                            .map(
                              (id) => assignees.find((p) => p.id === id)?.displayName ?? t.skipped
                            )
                            .join(", ")}
                        </p>
                        <ol>
                          {plan.steps.map((step) => (
                            <li key={step.id}>{step.title}</li>
                          ))}
                        </ol>
                        {row.state !== "ENDED" && (
                          <>
                            <div className="task-actions">
                              <Button
                                className="task-secondary"
                                disabled={busy || !!editing}
                                onClick={() => setEditing(row)}
                              >
                                {t.edit}
                              </Button>
                              <Button
                                className="task-secondary"
                                disabled={busy || !!editing}
                                onClick={() =>
                                  void command(
                                    `/${row.id}/${row.state === "ACTIVE" ? "pause" : "resume"}`,
                                    { version: row.version }
                                  )
                                }
                              >
                                {row.state === "ACTIVE" ? t.pause : t.resume}
                              </Button>
                              <Button
                                className="task-primary"
                                disabled={busy || !!editing || row.state !== "ACTIVE"}
                                onClick={() =>
                                  void command(`/${row.id}/generate`, { version: row.version })
                                }
                              >
                                {t.generate}
                              </Button>
                              <Button
                                className="task-secondary"
                                disabled={busy || !!editing}
                                onClick={() => setConfirmEnd(row.id)}
                              >
                                {t.end}
                              </Button>
                            </div>
                            {confirmEnd === row.id && (
                              <div className="checklist-confirm" role="group" aria-label={t.end}>
                                <p>{t.endHint}</p>
                                <div className="task-actions">
                                  <Button
                                    className="task-primary"
                                    disabled={busy}
                                    onClick={() =>
                                      void command(`/${row.id}/end`, { version: row.version })
                                    }
                                  >
                                    {t.confirm}
                                  </Button>
                                  <Button
                                    className="task-secondary"
                                    disabled={busy}
                                    onClick={() => setConfirmEnd(undefined)}
                                  >
                                    {t.cancel}
                                  </Button>
                                </div>
                              </div>
                            )}
                            <form
                              className="task-actions"
                              onSubmit={(e) => {
                                e.preventDefault();
                                void command(`/${row.id}/skip`, {
                                  version: row.version,
                                  localDate: skipDates[row.id] ?? row.localToday,
                                });
                              }}
                            >
                              <label>
                                {t.skipDate}
                                <Input
                                  type="date"
                                  required
                                  value={skipDates[row.id] ?? row.localToday}
                                  disabled={busy || !!editing}
                                  onChange={(e) =>
                                    setSkipDates({ ...skipDates, [row.id]: e.target.value })
                                  }
                                />
                              </label>
                              <Button
                                type="submit"
                                className="task-secondary"
                                disabled={busy || !!editing}
                              >
                                {t.skip}
                              </Button>
                            </form>
                          </>
                        )}
                        {row.occurrences.length > 0 && (
                          <details>
                            <summary>{t.outcomes}</summary>
                            <ul className="checklist-outcomes">
                              {row.occurrences.map((item) => (
                                <li key={item.id}>
                                  {item.localDate} ·{" "}
                                  {item.state === "GENERATED"
                                    ? `${item.taskIds.length} ${item.taskIds.length === 1 ? t.task : t.tasks}`
                                    : `${t.skipped}: ${item.reason ? t.reasons[item.reason] : ""}`}
                                  {item.skippedAssignees.length > 0
                                    ? ` · ${item.skippedAssignees.length} ${t.skipped.toLocaleLowerCase(locale)}`
                                    : ""}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}
            <footer className="task-pagination">
              <Button
                className="task-secondary"
                disabled={busy || page === 1}
                onClick={() => setPage(page - 1)}
              >
                {t.prev}
              </Button>
              <span>
                {t.page} {page} / {Math.max(1, Math.ceil(data.total / 10))}
              </span>
              <Button
                className="task-secondary"
                disabled={busy || page * 10 >= data.total}
                onClick={() => setPage(page + 1)}
              >
                {t.next}
              </Button>
            </footer>
          </>
        )
      )}
    </section>
  );
}
