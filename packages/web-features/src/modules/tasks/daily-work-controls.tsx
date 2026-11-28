import { Button, Input } from "@corely/ui";
import { TaskDueFilterSchema, type EmployeeTask, type TaskDueFilter } from "@corely/contracts";
import type { ReactNode } from "react";
import type { tasksCopy } from "./tasks-copy";

type Copy = (typeof tasksCopy)["en"];
type Controls = {
  view: "auto" | "mine" | "team";
  layout: "list" | "board";
  dueFilter: TaskDueFilter;
  search: string;
  filter: string;
};

export function DailyWorkControls({
  copy: t,
  value,
  teamView,
  canManage,
  timezone,
  busy,
  onChange,
  onLayoutChange,
}: {
  copy: Copy;
  value: Controls;
  teamView: boolean;
  canManage: boolean;
  timezone?: string;
  busy: boolean;
  onChange(value: Controls): void;
  onLayoutChange(value: Controls["layout"]): void;
}) {
  const update = (change: Partial<Controls>) => onChange({ ...value, ...change });
  return (
    <>
      <div className="task-work-controls">
        <div className="task-actions">
          {(canManage || value.view === "team") && (
            <Button
              type="button"
              className="task-secondary"
              aria-pressed={!teamView}
              onClick={() => update({ view: "mine" })}
            >
              {t.myWork}
            </Button>
          )}
          {canManage && (
            <Button
              type="button"
              className="task-secondary"
              aria-pressed={teamView}
              onClick={() => update({ view: "team" })}
            >
              {t.teamView}
            </Button>
          )}
        </div>
        <div className="task-actions">
          <Button
            type="button"
            className="task-secondary"
            aria-pressed={value.layout === "list"}
            onClick={() => onLayoutChange("list")}
          >
            {t.list}
          </Button>
          <Button
            type="button"
            className="task-secondary"
            aria-pressed={value.layout === "board"}
            onClick={() => onLayoutChange("board")}
          >
            {t.board}
          </Button>
        </div>
      </div>
      <div className="task-toolbar">
        <label>
          {t.search}
          <Input
            type="search"
            maxLength={120}
            value={value.search}
            onChange={(event) => update({ search: event.target.value })}
          />
        </label>
        <label>
          {t.dueFilter}
          <select
            value={value.dueFilter}
            onChange={(event) => {
              const due = TaskDueFilterSchema.safeParse(event.target.value);
              if (due.success) {
                update({ dueFilter: due.data });
              }
            }}
          >
            <option value="all">{t.all}</option>
            <option value="today">{t.today}</option>
            <option value="overdue">{t.overdue}</option>
            <option value="upcoming">{t.upcoming}</option>
          </select>
        </label>
        <label>
          {t.filter}
          <select
            value={value.filter}
            disabled={busy}
            onChange={(event) => update({ filter: event.target.value })}
          >
            <option value="all">{t.all}</option>
            <option value="OPEN">{t.open}</option>
            <option value="COMPLETED">{t.completed}</option>
          </select>
        </label>
        {timezone && (
          <span>
            {t.workspaceZone} · {timezone}
          </span>
        )}
      </div>
    </>
  );
}

export function DailyWorkBoard({
  items,
  filter,
  renderTask,
  copy: t,
}: {
  items: EmployeeTask[];
  filter: string;
  renderTask(task: EmployeeTask): ReactNode;
  copy: Copy;
}) {
  return (
    <div className="task-board">
      {(["OPEN", "COMPLETED"] as const)
        .filter((status) => filter === "all" || filter === status)
        .map((status) => {
          const tasks = items.filter((task) => task.status === status);
          return (
            <section key={status}>
              <h2>
                {status === "OPEN" ? t.open : t.completed} ({tasks.length})
              </h2>
              {tasks.length === 0 ? (
                <p>{t.noInColumn}</p>
              ) : (
                <ul className="task-list">{tasks.map(renderTask)}</ul>
              )}
            </section>
          );
        })}
    </div>
  );
}
