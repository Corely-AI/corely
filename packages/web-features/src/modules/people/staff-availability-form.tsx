import { usePeopleDraftGuard } from "./people-runtime";
import { useRef, useState } from "react";
import { Button, Input, Label } from "@corely/ui";
import {
  SaveStaffAvailabilitySchema,
  type StaffAvailabilityView,
  type StaffPattern,
} from "@corely/contracts";
import type { AvailabilityCopy } from "./availability-copy";
import { usePeopleApi } from "./people-runtime";
import { usePeopleMounted } from "./use-people";

function template(pattern?: StaffPattern): StaffPattern {
  const timezone = pattern?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const effectiveFrom = pattern && pattern.effectiveFrom > today ? pattern.effectiveFrom : today;
  return pattern
    ? {
        ...pattern,
        effectiveFrom,
        effectiveUntil:
          pattern.effectiveUntil && pattern.effectiveUntil > effectiveFrom
            ? pattern.effectiveUntil
            : null,
        exceptions: pattern.exceptions.filter((e) => e.date >= effectiveFrom),
      }
    : { timezone, effectiveFrom, effectiveUntil: null, weeklyHours: [], exceptions: [] };
}
export function StaffAvailabilityForm({
  id,
  value,
  copy: t,
  onSaved,
  onReload,
}: {
  id: string;
  value: StaffAvailabilityView;
  copy: AvailabilityCopy;
  onSaved: () => void;
  onReload: () => void;
}) {
  const peopleApi = usePeopleApi();
  const [dirty, setDirty] = useState(false);
  usePeopleDraftGuard(dirty);
  const [pattern, setPattern] = useState(() => template(value.plans.at(-1)?.pattern));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [invalid, setInvalid] = useState<string[]>([]);
  const mounted = usePeopleMounted();
  const operation = useRef<{ fingerprint: string; key: string }>();
  const update = (fields: Partial<StaffPattern>) => {
    setDirty(true);
    setPattern((p) => ({ ...p, ...fields }));
  };
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = SaveStaffAvailabilitySchema.safeParse({
      version: value.version,
      profileVersion: value.profileVersion,
      pattern,
    });
    if (!parsed.success) {
      setInvalid(parsed.error.issues.map((i) => i.message));
      return;
    }
    const fingerprint = JSON.stringify(parsed.data);
    if (operation.current?.fingerprint !== fingerprint) {
      operation.current = { fingerprint, key: crypto.randomUUID() };
    }
    setBusy(true);
    setFailed(false);
    setInvalid([]);
    try {
      await peopleApi.saveAvailability(id, parsed.data, operation.current.key);
      if (mounted.current) {
        setDirty(false);
        onSaved();
      }
    } catch {
      if (mounted.current) {
        setFailed(true);
      }
    } finally {
      if (mounted.current) {
        setBusy(false);
      }
    }
  }
  const hours = (index: number, fields: Partial<StaffPattern["weeklyHours"][number]>) =>
    update({
      weeklyHours: pattern.weeklyHours.map((w, i) => (i === index ? { ...w, ...fields } : w)),
    });
  return (
    <form onChange={() => setDirty(true)} onSubmit={submit} className="space-y-5">
      <fieldset disabled={busy} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="availability-timezone">{t.timezone}</Label>
            <Input
              id="availability-timezone"
              required
              value={pattern.timezone}
              onChange={(e) => update({ timezone: e.target.value })}
              placeholder="Europe/Berlin"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="availability-from">{t.from}</Label>
            <Input
              id="availability-from"
              type="date"
              required
              value={pattern.effectiveFrom}
              onChange={(e) => update({ effectiveFrom: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="availability-until">{t.until}</Label>
            <Input
              id="availability-until"
              type="date"
              value={pattern.effectiveUntil ?? ""}
              onChange={(e) => update({ effectiveUntil: e.target.value || null })}
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{t.dates}</p>
        <div className="space-y-3">
          <h3 className="font-medium">{t.weekly}</h3>
          {!pattern.weeklyHours.length && (
            <p className="text-sm text-muted-foreground">{t.closed}</p>
          )}
          {pattern.weeklyHours.map((w, i) => (
            <div
              key={i}
              className="grid grid-cols-2 items-end gap-3 rounded-md border p-3 sm:grid-cols-4"
            >
              <div className="col-span-2 space-y-2 sm:col-span-1">
                <Label htmlFor={`weekly-day-${i}`}>
                  {t.day} {i + 1}
                </Label>
                <select
                  id={`weekly-day-${i}`}
                  className="h-10 w-full rounded-md border bg-background px-3"
                  value={w.dayOfWeek}
                  onChange={(e) => hours(i, { dayOfWeek: Number(e.target.value) })}
                >
                  {t.days.map((d, n) => (
                    <option key={d} value={n}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor={`weekly-start-${i}`}>
                  {t.start} {i + 1}
                </Label>
                <Input
                  id={`weekly-start-${i}`}
                  type="time"
                  required
                  value={w.startTime}
                  onChange={(e) => hours(i, { startTime: e.target.value })}
                />
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor={`weekly-end-${i}`}>
                  {t.end} {i + 1}
                </Label>
                <Input
                  id={`weekly-end-${i}`}
                  type="time"
                  required
                  value={w.endTime}
                  onChange={(e) => hours(i, { endTime: e.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                aria-label={`${t.remove} ${t.weekly} ${i + 1}`}
                onClick={() =>
                  update({ weeklyHours: pattern.weeklyHours.filter((_, n) => n !== i) })
                }
              >
                {t.remove}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={pattern.weeklyHours.length >= 56}
            onClick={() =>
              update({
                weeklyHours: [
                  ...pattern.weeklyHours,
                  { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
                ],
              })
            }
          >
            {t.addHours}
          </Button>
        </div>
        <div className="space-y-3">
          <h3 className="font-medium">{t.exceptions}</h3>
          {pattern.exceptions.map((e, i) => (
            <div key={i} className="space-y-3 rounded-md border p-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor={`exception-date-${i}`}>
                    {t.date} {i + 1}
                  </Label>
                  <Input
                    id={`exception-date-${i}`}
                    type="date"
                    required
                    value={e.date}
                    onChange={(event) =>
                      update({
                        exceptions: pattern.exceptions.map((ex, n) =>
                          n === i ? { ...ex, date: event.target.value } : ex
                        ),
                      })
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  aria-label={`${t.remove} ${t.exceptions} ${i + 1}`}
                  onClick={() =>
                    update({ exceptions: pattern.exceptions.filter((_, n) => n !== i) })
                  }
                >
                  {t.remove}
                </Button>
              </div>
              <ExceptionWindows
                windows={e.windows}
                index={i}
                copy={t}
                onChange={(windows) =>
                  update({
                    exceptions: pattern.exceptions.map((ex, n) =>
                      n === i ? { ...ex, windows } : ex
                    ),
                  })
                }
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={pattern.exceptions.length >= 366}
            onClick={() =>
              update({
                exceptions: [...pattern.exceptions, { date: pattern.effectiveFrom, windows: [] }],
              })
            }
          >
            {t.addException}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{t.hint}</p>
        <p className="text-sm text-muted-foreground">{t.precedence}</p>
        {invalid.length > 0 && (
          <div role="alert" className="text-destructive">
            {t.failed}
          </div>
        )}
        {failed && (
          <div role="alert" className="space-y-2">
            <p>{t.failed}</p>
            <Button type="button" variant="outline" onClick={onReload}>
              {t.reload}
            </Button>
          </div>
        )}
        <Button type="submit">{busy ? t.saving : t.save}</Button>
      </fieldset>
      {value.plans.length > 0 && (
        <details className="rounded-md border p-3">
          <summary className="cursor-pointer font-medium">
            {t.history} ({value.plans.length})
          </summary>
          <ul className="mt-3 space-y-4">
            {[...value.plans].reverse().map((p) => (
              <li key={p.revision} className="space-y-2 border-b pb-3 text-sm">
                <p>
                  {p.pattern.effectiveFrom} → {p.pattern.effectiveUntil ?? t.untilOpen} ·{" "}
                  {p.pattern.timezone}
                </p>
                <p>
                  {p.pattern.weeklyHours
                    .map((w) => `${t.days[w.dayOfWeek]} ${w.startTime}–${w.endTime}`)
                    .join("; ") || t.closed}
                </p>
                {p.pattern.exceptions.map((e) => (
                  <p key={e.date}>
                    {e.date}:{" "}
                    {e.windows.map((w) => `${w.startTime}–${w.endTime}`).join(", ") || t.closed}
                  </p>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setDirty(true);
                    setPattern(template(p.pattern));
                    setInvalid([]);
                    setFailed(false);
                  }}
                >
                  {t.template}
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </form>
  );
}

function ExceptionWindows({
  windows,
  onChange,
  index,
  copy: t,
}: {
  windows: StaffPattern["exceptions"][number]["windows"];
  index: number;
  copy: AvailabilityCopy;
  onChange: (value: StaffPattern["exceptions"][number]["windows"]) => void;
}) {
  return (
    <div className="space-y-3">
      {!windows.length && <p className="text-sm text-muted-foreground">{t.closed}</p>}
      {windows.map((w, i) => (
        <div key={i} className="grid grid-cols-2 items-end gap-3 sm:grid-cols-3">
          {(["startTime", "endTime"] as const).map((field) => (
            <div key={field} className="min-w-0 space-y-2">
              <Label htmlFor={`exception-${index}-${i}-${field}`}>
                {field === "startTime" ? t.start : t.end} {index + 1}.{i + 1}
              </Label>
              <Input
                id={`exception-${index}-${i}-${field}`}
                type="time"
                required
                value={w[field]}
                onChange={(e) =>
                  onChange(windows.map((v, n) => (n === i ? { ...v, [field]: e.target.value } : v)))
                }
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            aria-label={`${t.remove} ${t.exceptions} ${index + 1}.${i + 1}`}
            onClick={() => onChange(windows.filter((_, n) => n !== i))}
          >
            {t.remove}
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={windows.length >= 8}
        onClick={() => onChange([...windows, { startTime: "09:00", endTime: "17:00" }])}
      >
        {t.addRange}
      </Button>
    </div>
  );
}
