import { usePeopleDraftGuard } from "./people-runtime";
import { useState, type FormEvent } from "react";
import { Button, Input, Label, Textarea } from "@corely/ui";
import { type StaffPrivate } from "@corely/contracts";
import { usePeopleApi } from "./people-runtime";
import { usePeopleLoad, usePeopleMounted } from "./use-people";
import type { PeopleCopy } from "./people-copy";
export function StaffPrivateDetails({
  id,
  scope,
  copy: t,
  read,
  manage,
  onSaved,
}: {
  id: string;
  scope: string;
  copy: PeopleCopy;
  read: boolean;
  manage: boolean;
  onSaved: () => void;
}) {
  const peopleApi = usePeopleApi();
  const result = usePeopleLoad(
    (signal) => peopleApi.private(id, signal),
    `${scope}:${id}:private:${read}`,
    read
  );
  if (!read) {
    return null;
  }
  return (
    <section className="space-y-4 rounded-lg border p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{t.private}</h2>
      <p className="text-sm text-muted-foreground">{t.privateHint}</p>
      {result.loading ? (
        <p role="status">{t.loading}</p>
      ) : result.error ? (
        <div role="alert">
          {t.error}
          <Button variant="outline" onClick={result.reload}>
            {t.retry}
          </Button>
        </div>
      ) : (
        result.data && (
          <PrivateForm
            key={`${id}:${result.data.version}`}
            id={id}
            data={result.data}
            copy={t}
            manage={manage}
            reload={() => {
              result.reload();
              onSaved();
            }}
          />
        )
      )}
    </section>
  );
}
function PrivateForm({
  id,
  data,
  copy: t,
  manage,
  reload,
}: {
  id: string;
  data: StaffPrivate;
  copy: PeopleCopy;
  manage: boolean;
  reload: () => void;
}) {
  const [dirty, setDirty] = useState(false);
  usePeopleDraftGuard(dirty);
  const peopleApi = usePeopleApi();
  const mounted = usePeopleMounted();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setFailed(false);
    try {
      await peopleApi.command(
        `/${id}/private`,
        "PATCH",
        {
          version: data.version,
          personalEmail: String(form.get("personalEmail") ?? "").trim() || null,
          personalPhone: String(form.get("personalPhone") ?? "").trim() || null,
          notes: String(form.get("notes") ?? "").trim() || null,
        },
        crypto.randomUUID()
      );
      if (!mounted.current) {
        return;
      }
      setDirty(false);
      setSaved(true);
      reload();
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
  if (failed) {
    return (
      <div role="alert">
        <p>{t.changed}</p>
        <Button variant="outline" onClick={reload}>
          {t.reload}
        </Button>
      </div>
    );
  }
  return (
    <form
      onChange={() => setDirty(true)}
      className="space-y-4"
      onSubmit={(event) => void submit(event)}
    >
      <fieldset disabled={!manage || busy} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="personalEmail">{t.email}</Label>
            <Input
              type="email"
              name="personalEmail"
              id="personalEmail"
              maxLength={254}
              defaultValue={data.personalEmail ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="personalPhone">{t.phone}</Label>
            <Input
              name="personalPhone"
              id="personalPhone"
              maxLength={80}
              defaultValue={data.personalPhone ?? ""}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="privateNotes">{t.notes}</Label>
          <Textarea
            name="notes"
            id="privateNotes"
            maxLength={4000}
            defaultValue={data.notes ?? ""}
          />
        </div>
        {manage && <Button type="submit">{busy ? t.saving : t.savePrivate}</Button>}
      </fieldset>
      {saved && <p role="status">{t.saved}</p>}
    </form>
  );
}
