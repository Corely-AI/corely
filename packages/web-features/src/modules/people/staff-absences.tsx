import { usePeopleDraftGuard } from "./people-runtime";
import { useState, useRef, type FormEvent } from "react";
import { Button, Input, Label, Textarea, Badge } from "@corely/ui";
import { ConfirmDeleteDialog } from "@corely/web-shared/shared/crud";
import { RecordStaffAbsenceSchema, type StaffAbsence } from "@corely/contracts";
import { usePeopleApi } from "./people-runtime";
import { usePeopleAccess, usePeopleLoad, usePeopleMounted } from "./use-people";
import { absenceCopy, type AbsenceCopy } from "./absence-copy";
import { StaffAbsenceAttachments } from "./staff-absence-attachments";

export function StaffAbsences({
  id,
  archived,
  onSaved,
}: {
  id: string;
  archived: boolean;
  onSaved: () => void;
}) {
  const access = usePeopleAccess();
  const read = !access.loading && access.can("private.read");
  const manage = read && access.can("profile.manage") && access.can("private.manage") && !archived;
  const documents = read && access.can("documents.read");
  if (!read) {
    return null;
  }
  return (
    <AbsenceRecords
      key={JSON.stringify([access.scope, id, manage, documents])}
      id={id}
      manage={manage}
      documents={documents}
      onSaved={onSaved}
    />
  );
}
function AbsenceRecords({
  id,
  manage,
  documents,
  onSaved,
}: {
  id: string;
  manage: boolean;
  documents: boolean;
  onSaved: () => void;
}) {
  const peopleApi = usePeopleApi();
  const access = usePeopleAccess();
  const t = absenceCopy[access.locale === "de" || access.locale === "vi" ? access.locale : "en"];
  const result = usePeopleLoad(
    (signal) => peopleApi.absences(id, signal),
    `${access.scope}:${id}:absences`
  );
  const mounted = usePeopleMounted();
  const operation = useRef<{ fingerprint: string; key: string }>();
  const [editing, setEditing] = useState<StaffAbsence | "new" | null>(null);
  const [cancelling, setCancelling] = useState<StaffAbsence | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  function reload() {
    setEditing(null);
    setCancelling(null);
    setFailed(false);
    result.reload();
  }
  function complete() {
    setSaved(true);
    reload();
    onSaved();
  }
  async function cancel() {
    if (!cancelling) {
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      const fingerprint = JSON.stringify([
        cancelling.id,
        cancelling.revisions[cancelling.revisions.length - 1].version,
      ]);
      if (operation.current?.fingerprint !== fingerprint) {
        operation.current = { fingerprint, key: crypto.randomUUID() };
      }
      await peopleApi.absenceCommand(
        id,
        cancelling.id,
        "cancel",
        { version: cancelling.revisions[cancelling.revisions.length - 1].version },
        operation.current.key
      );
      if (mounted.current) {
        complete();
      }
    } catch {
      if (mounted.current) {
        setFailed(true);
      }
    } finally {
      if (mounted.current) {
        setBusy(false);
        setCancelling(null);
      }
    }
  }
  return (
    <section aria-label={t.title} className="space-y-5 rounded-lg border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t.title}</h2>
        {manage && !editing && (
          <Button
            variant="outline"
            onClick={() => {
              setEditing("new");
              setSaved(false);
            }}
          >
            {t.add}
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{t.intro}</p>
      {saved && <p role="status">{t.saved}</p>}
      {failed && (
        <div role="alert">
          <p>{t.failed}</p>
          <Button variant="outline" onClick={reload}>
            {t.reload}
          </Button>
        </div>
      )}
      {result.loading ? (
        <p role="status">{access.copy.loading}</p>
      ) : result.error ? (
        <div role="alert">
          <p>{t.error}</p>
          <Button variant="outline" onClick={reload}>
            {access.copy.retry}
          </Button>
        </div>
      ) : (
        <>
          {!result.data?.items.length && <p>{t.empty}</p>}
          {editing && manage && (
            <AbsenceForm
              key={
                editing === "new"
                  ? "new"
                  : `${editing.id}:${editing.revisions[editing.revisions.length - 1].version}`
              }
              staffId={id}
              record={editing === "new" ? undefined : editing}
              copy={t}
              onSaved={complete}
              onClose={() => setEditing(null)}
              onReload={reload}
            />
          )}
          {result.data?.items.map((record) => {
            const current = record.revisions[record.revisions.length - 1];
            const active = current.status === "approved";
            return (
              <article key={record.id} className="space-y-4 rounded-md border p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline">{active ? t.approved : t.cancelled}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {t.version} {current.version}
                  </span>
                </div>
                <p className="break-words text-sm">
                  {current.range.kind === "full-day"
                    ? `${current.range.startDate} → ${current.range.endDate} · ${t.endDate}`
                    : `${current.startAt} → ${current.endAt}`}{" "}
                  · {current.range.timezone}
                </p>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">{t.reason}</dt>
                    <dd className="break-words whitespace-pre-wrap">{current.reason}</dd>
                  </div>
                  {current.notes && (
                    <div>
                      <dt className="text-muted-foreground">{t.notes}</dt>
                      <dd className="break-words whitespace-pre-wrap">{current.notes}</dd>
                    </div>
                  )}
                </dl>
                {manage && active && (
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditing(record);
                        setSaved(false);
                      }}
                    >
                      {t.edit}
                    </Button>
                    <Button variant="outline" onClick={() => setCancelling(record)}>
                      {t.cancel}
                    </Button>
                  </div>
                )}
                <details>
                  <summary className="cursor-pointer text-sm font-medium">
                    {t.history} ({record.revisions.length})
                  </summary>
                  <ol className="mt-3 space-y-3 text-sm">
                    {record.revisions.map((revision) => (
                      <li key={revision.version} className="break-words rounded bg-muted p-3">
                        {t.version} {revision.version} ·{" "}
                        {revision.status === "approved" ? t.approved : t.cancelled}
                        <br />
                        {revision.changedAt}
                        <br />
                        {revision.startAt} → {revision.endAt}
                        <br />
                        {revision.reason}
                        {revision.notes && <p className="whitespace-pre-wrap">{revision.notes}</p>}
                      </li>
                    ))}
                  </ol>
                </details>
                {documents && (
                  <StaffAbsenceAttachments
                    staffId={id}
                    record={record}
                    manage={manage && active}
                    copy={t}
                  />
                )}
              </article>
            );
          })}
        </>
      )}
      <ConfirmDeleteDialog
        trigger={null}
        open={Boolean(cancelling)}
        onOpenChange={(open) => {
          if (!open) {
            setCancelling(null);
          }
        }}
        title={t.cancel}
        description={t.cancelHint}
        confirmLabel={t.cancel}
        cancelLabel={access.copy.cancel}
        isLoading={busy}
        onConfirm={cancel}
      />
    </section>
  );
}
function AbsenceForm({
  staffId,
  record,
  copy: t,
  onSaved,
  onClose,
  onReload,
}: {
  staffId: string;
  record?: StaffAbsence;
  copy: AbsenceCopy;
  onSaved: () => void;
  onClose: () => void;
  onReload: () => void;
}) {
  const [dirty, setDirty] = useState(false);
  usePeopleDraftGuard(dirty);
  const peopleApi = usePeopleApi();
  const current = record?.revisions.at(-1);
  const [kind, setKind] = useState(current?.range.kind ?? "full-day");
  const [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false);
  const mounted = usePeopleMounted();
  const operation = useRef<{ fingerprint: string; key: string }>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget),
      value = (key: string) => String(form.get(key) ?? "");
    const utc = (key: string) => new Date(`${value(key)}Z`).toISOString();
    setBusy(true);
    setFailed(false);
    try {
      const fields = RecordStaffAbsenceSchema.parse({
        reason: value("reason"),
        notes: value("notes").trim() || null,
        range:
          kind === "full-day"
            ? {
                kind,
                timezone: value("timezone"),
                startDate: value("startDate"),
                endDate: value("endDate"),
              }
            : { kind, timezone: value("timezone"), startAt: utc("startAt"), endAt: utc("endAt") },
      });
      const body = { ...fields, ...(current ? { version: current.version } : {}) };
      const fingerprint = JSON.stringify(body);
      if (operation.current?.fingerprint !== fingerprint) {
        operation.current = { fingerprint, key: crypto.randomUUID() };
      }
      await peopleApi.absenceCommand(
        staffId,
        record?.id,
        record ? "correct" : "record",
        body,
        operation.current.key
      );
      if (mounted.current) {
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
  return (
    <form
      onChange={() => setDirty(true)}
      className="space-y-4 rounded-md bg-muted/40 p-4"
      onSubmit={(event) => void submit(event)}
    >
      <h3 className="font-medium">{record ? t.edit : t.add}</h3>
      <p className="text-sm text-muted-foreground">{t.hint}</p>
      <fieldset disabled={busy} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="absence-kind">{t.kind}</Label>
            <select
              id="absence-kind"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={kind}
              onChange={(event) => setKind(event.target.value as typeof kind)}
            >
              <option value="full-day">{t.full}</option>
              <option value="partial-day">{t.partial}</option>
            </select>
          </div>
          <div>
            <Label htmlFor="absence-timezone">{t.timezone}</Label>
            <Input
              id="absence-timezone"
              name="timezone"
              required
              maxLength={100}
              defaultValue={
                current?.range.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
              }
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {kind === "full-day" ? (
            <>
              <div>
                <Label htmlFor="absence-start-date">{t.startDate}</Label>
                <Input
                  className="min-w-0"
                  id="absence-start-date"
                  name="startDate"
                  type="date"
                  required
                  defaultValue={current?.range.kind === "full-day" ? current.range.startDate : ""}
                />
              </div>
              <div>
                <Label htmlFor="absence-end-date">{t.endDate}</Label>
                <Input
                  className="min-w-0"
                  id="absence-end-date"
                  name="endDate"
                  type="date"
                  required
                  defaultValue={current?.range.kind === "full-day" ? current.range.endDate : ""}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="absence-start">{t.start}</Label>
                <Input
                  className="min-w-0"
                  id="absence-start"
                  name="startAt"
                  type="datetime-local"
                  step="any"
                  required
                  defaultValue={current?.startAt.slice(0, -1)}
                />
              </div>
              <div>
                <Label htmlFor="absence-end">{t.end}</Label>
                <Input
                  className="min-w-0"
                  id="absence-end"
                  name="endAt"
                  type="datetime-local"
                  step="any"
                  required
                  defaultValue={current?.endAt.slice(0, -1)}
                />
              </div>
            </>
          )}
        </div>
        <div>
          <Label htmlFor="absence-reason">{t.reason}</Label>
          <Input
            id="absence-reason"
            name="reason"
            required
            maxLength={500}
            defaultValue={current?.reason}
          />
        </div>
        <div>
          <Label htmlFor="absence-notes">{t.notes}</Label>
          <Textarea
            id="absence-notes"
            name="notes"
            maxLength={4000}
            defaultValue={current?.notes ?? ""}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit">{record ? t.correction : t.save}</Button>
          <Button type="button" variant="outline" onClick={onClose}>
            {t.close}
          </Button>
        </div>
      </fieldset>
      {failed && (
        <div role="alert">
          <p className="text-sm">{t.failed}</p>
          <Button type="button" variant="outline" onClick={onReload}>
            {t.reload}
          </Button>
        </div>
      )}
    </form>
  );
}
