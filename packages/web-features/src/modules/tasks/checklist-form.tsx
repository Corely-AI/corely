import { useRef, useState, useEffect, type FormEvent } from "react";
import { Button, Input } from "@corely/ui";
import {
  PublishChecklistSchema,
  type PublishChecklist,
  type ChecklistTemplateView,
  type TaskAssignee,
} from "@corely/contracts";
import type { ChecklistCopy } from "./checklists-copy";
export function nextDate(date: string) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);
}
export function dateInZone(zone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function ChecklistForm({
  template,
  assignees,
  busy,
  locale,
  t,
  onSave,
  onCancel,
}: {
  template: ChecklistTemplateView | null;
  assignees: TaskAssignee[];
  busy: boolean;
  locale: string;
  t: ChecklistCopy;
  onSave: (plan: PublishChecklist) => void;
  onCancel: () => void;
}) {
  const previous = template?.plans.at(-1);
  const [zone, setZone] = useState(
    template?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [title, setTitle] = useState(previous?.title ?? "");
  const [from, setFrom] = useState(template ? nextDate(template.localToday) : dateInZone(zone));
  const [until, setUntil] = useState(previous?.effectiveUntil ?? "");
  const [due, setDue] = useState(previous?.dueTime ?? "09:00");
  const [days, setDays] = useState(previous?.weekdays ?? [0, 1, 2, 3, 4, 5, 6]);
  const [owners, setOwners] = useState(previous?.assigneeIds ?? []);
  const [steps, setSteps] = useState(previous?.steps ?? [{ id: crypto.randomUUID(), title: "" }]);
  const [invalid, setInvalid] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);
  function submit(event: FormEvent) {
    event.preventDefault();
    const result = PublishChecklistSchema.safeParse({
      title,
      timezone: zone,
      effectiveFrom: from,
      effectiveUntil: until || null,
      dueTime: due,
      weekdays: days,
      assigneeIds: owners,
      steps,
    });
    setInvalid(!result.success);
    if (result.success) {
      onSave(result.data);
    }
  }
  return (
    <form className="task-form" onSubmit={submit}>
      <h2>{template ? t.edit : t.add}</h2>
      {template && <p className="task-muted">{t.future}</p>}
      {invalid && (
        <p role="alert" className="task-error">
          {t.invalid}
        </p>
      )}
      <label>
        {t.name}
        <Input
          ref={titleRef}
          value={title}
          required
          maxLength={160}
          disabled={busy}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <div className="task-fields">
        <label>
          {t.timezone}
          <Input
            value={zone}
            required
            maxLength={100}
            disabled={busy || !!template}
            onChange={(e) => setZone(e.target.value)}
            list="checklist-timezones"
          />
        </label>
        <datalist id="checklist-timezones">
          {["Europe/Berlin", "Europe/London", "Asia/Ho_Chi_Minh", "America/New_York", "UTC"].map(
            (v) => (
              <option key={v} value={v} />
            )
          )}
        </datalist>
        <label>
          {t.due}
          <Input
            type="time"
            value={due}
            required
            disabled={busy}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
        <label>
          {t.from}
          <Input
            type="date"
            value={from}
            min={template ? nextDate(template.localToday) : undefined}
            required
            disabled={busy}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          {t.until}
          <Input
            type="date"
            value={until}
            min={from}
            disabled={busy}
            onChange={(e) => setUntil(e.target.value)}
          />
        </label>
      </div>
      <fieldset className="checklist-options" disabled={busy}>
        <legend>{t.weekdays}</legend>
        {[1, 2, 3, 4, 5, 6, 0].map((day) => (
          <label key={day} className="checklist-check">
            <input
              type="checkbox"
              checked={days.includes(day)}
              onChange={(e) =>
                setDays(e.target.checked ? [...days, day].sort() : days.filter((d) => d !== day))
              }
            />
            {new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(
              new Date(Date.UTC(2026, 10, 8 + day))
            )}
          </label>
        ))}
      </fieldset>
      <fieldset className="checklist-options" disabled={busy}>
        <legend>{t.assignees}</legend>
        {assignees.length === 0 && <p>{t.noStaff}</p>}
        {assignees.map((person) => (
          <label key={person.id} className="checklist-check">
            <input
              type="checkbox"
              checked={owners.includes(person.id)}
              onChange={(e) =>
                setOwners(
                  e.target.checked
                    ? [...owners, person.id]
                    : owners.filter((id) => id !== person.id)
                )
              }
            />
            {person.displayName}
          </label>
        ))}
        {owners
          .filter((id) => !assignees.some((p) => p.id === id))
          .map((id) => (
            <label key={id} className="checklist-check">
              <input
                type="checkbox"
                checked
                onChange={() => setOwners(owners.filter((v) => v !== id))}
              />
              {id} · {t.skipped}
            </label>
          ))}
      </fieldset>
      <fieldset className="checklist-steps" disabled={busy}>
        <legend>{t.steps}</legend>
        {steps.map((step, index) => (
          <div key={step.id} className="checklist-step-input">
            <label>
              {t.step} {index + 1}
              <Input
                value={step.title}
                required
                maxLength={240}
                onChange={(e) =>
                  setSteps(
                    steps.map((s) => (s.id === step.id ? { ...s, title: e.target.value } : s))
                  )
                }
              />
            </label>
            <Button
              type="button"
              className="task-secondary"
              aria-label={`${t.remove} ${index + 1}`}
              disabled={steps.length === 1}
              onClick={() => setSteps(steps.filter((s) => s.id !== step.id))}
            >
              ×
            </Button>
          </div>
        ))}
        <Button
          type="button"
          className="task-secondary"
          disabled={steps.length >= 10}
          onClick={() => setSteps([...steps, { id: crypto.randomUUID(), title: "" }])}
        >
          {t.addStep}
        </Button>
      </fieldset>
      <div className="task-actions">
        <Button type="submit" className="task-primary" disabled={busy || !assignees.length}>
          {template ? t.update : t.save}
        </Button>
        <Button type="button" className="task-secondary" disabled={busy} onClick={onCancel}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
