import { resolveCorelyLocale } from "@corely/contracts";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { checklistsCopy } from "./checklists-copy";
import "./checklists.css";
import { normalizeError } from "@corely/api-client";
import { TaskCreationGuidanceSlot, type TaskCreationGuidance } from "@corely/tasks-ui";
import { TaskCreationPolicyRejectedCode } from "@corely/contracts";
import { LoadingSkeleton, Button, Input } from "@corely/ui";
import type {
  EmployeeTask,
  EmployeeTaskList,
  TaskAssignee,
  TaskDueFilter,
} from "@corely/contracts";
import type { TasksClient } from "./tasks-client";
import { tasksCopy } from "./tasks-copy";
import { DailyWorkBoard, DailyWorkControls } from "./daily-work-controls";
import "./tasks.css";

function statusOf(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error
    ? Number(error.status)
    : 0;
}
function localValue(value: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export function DailyWork({
  client,
  locale = "en",
  templatesHref = "/tasks/templates",
  creationGuidance,
}: {
  client: TasksClient;
  locale?: string;
  templatesHref?: string;
  creationGuidance?: TaskCreationGuidance;
}) {
  const c = checklistsCopy[resolveCorelyLocale(locale)];
  const t = tasksCopy[resolveCorelyLocale(locale)];
  const [data, setData] = useState<EmployeeTaskList>();
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"auto" | "mine" | "team">("auto");
  const [layout, setLayout] = useState<"list" | "board">("list");
  const [dueFilter, setDueFilter] = useState<TaskDueFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<
    "denied" | "error" | "conflict" | "failed" | "invalidTime" | ""
  >("");
  const [policyError, setPolicyError] = useState<string>();
  const [notice, setNotice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<EmployeeTask | "new" | null>(null);
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [due, setDue] = useState("");
  const mounted = useRef(false);
  const commandRunning = useRef(false);
  const commandKeys = useRef(new Map<string, string>());
  const titleInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (editing) {
      titleInput.current?.focus();
    }
  }, [editing]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(undefined);
    setAssignees([]);
    void client
      .list(
        new URLSearchParams({
          status: filter,
          view,
          due: dueFilter,
          q: search.trim(),
          page: String(page),
          pageSize: "20",
        }).toString(),
        controller.signal
      )
      .then(async (result) => {
        const people = result.capabilities.manage ? await client.assignees(controller.signal) : [];
        if (!controller.signal.aborted) {
          setData(result);
          setAssignees(people);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setError([401, 403].includes(statusOf(error)) ? "denied" : "error");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [client, filter, view, dueFilter, search, page, revision, t]);
  function begin(task: EmployeeTask | "new") {
    setPolicyError(undefined);
    setEditing(task);
    setNotice(false);
    setError("");
    setTitle(task === "new" ? "" : task.title);
    setOwner(task === "new" ? "" : task.ownerStaffId);
    setDue(task === "new" ? "" : localValue(task.dueAt));
  }
  async function command(path: string, method: string, body: unknown, inPlace = false) {
    if (commandRunning.current) {
      return;
    }
    commandRunning.current = true;
    const signature = JSON.stringify([path, method, body]);
    const key = commandKeys.current.get(signature) ?? crypto.randomUUID();
    commandKeys.current.set(signature, key);
    setBusy(true);
    setPolicyError(undefined);
    setError("");
    setNotice(false);
    try {
      const saved = await client.command(path, method, body, key);
      commandKeys.current.delete(signature);
      if (mounted.current) {
        setEditing(null);
        if (inPlace) {
          setData((current) =>
            current
              ? {
                  ...current,
                  items: current.items.map((task) => (task.id === saved.id ? saved : task)),
                }
              : current
          );
        } else {
          setRevision((v) => v + 1);
        }
        setNotice(true);
      }
    } catch (error: unknown) {
      if (mounted.current) {
        const problem = normalizeError(error);
        if (method === "POST" && path === "" && problem.code === TaskCreationPolicyRejectedCode) {
          setPolicyError(problem.detail);
          return;
        }
        if ([401, 403, 404].includes(statusOf(error))) {
          // Current authority/ownership no longer permits this projection. Fetch it again
          // only on explicit retry; keep drafts solely for conflict/transient recovery.
          setData(undefined);
          setAssignees([]);
          setEditing(null);
          setTitle("");
          setOwner("");
          setDue("");
          commandKeys.current.clear();
        }
        setError(
          statusOf(error) === 409
            ? "conflict"
            : [401, 403, 404].includes(statusOf(error))
              ? "denied"
              : "failed"
        );
      }
    } finally {
      commandRunning.current = false;
      if (mounted.current) {
        setBusy(false);
      }
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!editing) {
      return;
    }
    const dueAt = due ? new Date(due) : null;
    if (dueAt && (!Number.isFinite(dueAt.getTime()) || localValue(dueAt.toISOString()) !== due)) {
      setError("invalidTime");
      return;
    }
    void command(editing === "new" ? "" : `/${editing.id}`, editing === "new" ? "POST" : "PATCH", {
      title,
      ownerStaffId: owner,
      // Preserve the stored instant when only other fields change (seconds and DST offset included).
      dueAt:
        editing !== "new" && due === localValue(editing.dueAt)
          ? editing.dueAt
          : (dueAt?.toISOString() ?? null),
      ...(editing === "new" ? {} : { version: editing.version }),
    });
  }
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const teamView = view === "team" || (view === "auto" && Boolean(data?.capabilities.manage));
  const workspaceTimezone = data?.timezone ?? "UTC";
  const renderTask = (task: EmployeeTask) => (
    <li key={task.id}>
      <article aria-label={task.title}>
        <div className="task-content">
          <span className={`task-status ${task.status === "COMPLETED" ? "is-completed" : ""}`}>
            {task.status === "COMPLETED" ? t.completed : t.open}
          </span>
          <h2>{task.title}</h2>
          <p>
            {task.ownerName}
            {task.ownerArchived ? ` · ${t.archived}` : ""}
          </p>
          <p className="task-muted">
            {task.dueAt ? (
              <time dateTime={task.dueAt}>
                {new Date(task.dueAt).toLocaleString(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: workspaceTimezone,
                })}
              </time>
            ) : (
              t.noDue
            )}
          </p>
          {task.checklist && (
            <div className="task-checklist">
              <p className="task-muted">
                {task.checklist.filter((s) => s.completed).length}/{task.checklist.length}{" "}
                {c.progress}
                {task.recurrence
                  ? ` · ${task.recurrence.localDate} · ${task.recurrence.timezone}`
                  : ""}
              </p>
              {task.checklist.map((step) => (
                <label className="checklist-check" key={step.id}>
                  <input
                    type="checkbox"
                    checked={step.completed}
                    disabled={
                      task.status !== "OPEN" ||
                      !!editing ||
                      !(data?.capabilities.manage || data?.capabilities.completeOwn)
                    }
                    aria-disabled={busy}
                    onChange={(event) => {
                      if (!busy) {
                        void command(
                          `/${task.id}/checklist/${step.id}`,
                          "POST",
                          { version: task.version, completed: event.target.checked },
                          true
                        );
                      }
                    }}
                  />
                  {step.title}
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="task-actions">
          {data?.capabilities.manage && (
            <Button
              className="task-secondary"
              disabled={busy || !!editing}
              onClick={() => begin(task)}
            >
              {t.edit}
            </Button>
          )}
          {(data?.capabilities.manage || data?.capabilities.completeOwn) && (
            <Button
              className="task-primary"
              disabled={
                busy ||
                !!editing ||
                (task.status === "OPEN" && task.checklist?.some((step) => !step.completed))
              }
              onClick={() =>
                void command(
                  `/${task.id}/${task.status === "OPEN" ? "complete" : "reopen"}`,
                  "POST",
                  { version: task.version }
                )
              }
            >
              {task.status === "OPEN" ? t.complete : t.reopen}
            </Button>
          )}
        </div>
      </article>
    </li>
  );

  return (
    <section className="daily-work" aria-busy={busy}>
      <header className="task-heading">
        <div>
          <p className="task-eyebrow">{teamView ? t.team : t.mine}</p>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>
        {data?.capabilities.manage && (
          <div className="task-actions">
            <Link className="checklist-back" to={templatesHref}>
              {c.title}
            </Link>
            <Button
              className="task-primary"
              disabled={busy || !!editing}
              onClick={() => begin("new")}
            >
              {t.add}
            </Button>
          </div>
        )}
      </header>
      {notice && (
        <p className="task-notice" role="status">
          {t.updated}
        </p>
      )}
      {error && (
        <div className="task-error" role="alert">
          <p>{t[error]}</p>
          <Button
            className="task-secondary"
            disabled={busy}
            onClick={() => {
              setEditing(null);
              setRevision((v) => v + 1);
            }}
          >
            {data ? t.reload : t.retry}
          </Button>
        </div>
      )}
      {editing && (
        <form className="task-form" onSubmit={submit}>
          <h2>{editing === "new" ? t.add : t.edit}</h2>
          <TaskCreationGuidanceSlot active={editing === "new"} Guidance={creationGuidance} />
          {editing === "new" && policyError && (
            <p className="task-error" role="alert">
              {policyError}
            </p>
          )}
          <label>
            {t.task}
            <Input
              ref={titleInput}
              required
              maxLength={240}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy}
            />
          </label>
          <div className="task-fields">
            <label>
              {t.owner}
              <select
                required
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                disabled={busy}
              >
                <option value="">{t.choose}</option>
                {editing !== "new" && !assignees.some((p) => p.id === editing.ownerStaffId) && (
                  <option value={editing.ownerStaffId}>
                    {editing.ownerName} · {t.archived}
                  </option>
                )}
                {assignees.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.due}
              <Input
                type="datetime-local"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                disabled={busy}
              />
            </label>
          </div>
          <p className="task-muted">
            {t.zone} {zone}
          </p>
          {assignees.length === 0 && <p>{t.noStaff}</p>}
          <div className="task-actions">
            <Button
              type="submit"
              className="task-primary"
              disabled={busy || !title.trim() || !owner}
            >
              {busy ? t.saving : t.save}
            </Button>
            <Button
              type="button"
              className="task-secondary"
              disabled={busy}
              onClick={() => setEditing(null)}
            >
              {t.cancel}
            </Button>
          </div>
        </form>
      )}
      <DailyWorkControls
        copy={t}
        value={{ view, layout, dueFilter, search, filter }}
        teamView={teamView}
        canManage={Boolean(data?.capabilities.manage)}
        timezone={data ? workspaceTimezone : undefined}
        busy={busy}
        onLayoutChange={setLayout}
        onChange={({ view, dueFilter, search, filter }) => {
          setView(view);
          setDueFilter(dueFilter);
          setSearch(search);
          setFilter(filter);
          setPage(1);
        }}
      />
      {loading ? (
        <LoadingSkeleton variant="list" label={t.loading} />
      ) : (
        data && (
          <>
            {data.items.length === 0 ? (
              <div className="task-empty">
                <span aria-hidden="true">✓</span>
                <h2>{t.empty}</h2>
                <p>{data.capabilities.manage ? t.managerHint : t.emptyHint}</p>
              </div>
            ) : layout === "board" ? (
              <DailyWorkBoard items={data.items} filter={filter} renderTask={renderTask} copy={t} />
            ) : (
              <ul className="task-list">{data.items.map(renderTask)}</ul>
            )}
            <footer className="task-pagination">
              <Button
                className="task-secondary"
                disabled={page === 1 || busy}
                onClick={() => setPage((p) => p - 1)}
              >
                {t.prev}
              </Button>
              <span>
                {t.page} {page} / {Math.max(1, Math.ceil(data.total / data.pageSize))}
              </span>
              <Button
                className="task-secondary"
                disabled={page * data.pageSize >= data.total || busy}
                onClick={() => setPage((p) => p + 1)}
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
