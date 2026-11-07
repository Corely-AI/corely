import { HttpError } from "@corely/api-client";
import { usePeopleMounted } from "./use-people";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Input, Label } from "@corely/ui";
import { CreateStaffSchema, type StaffProfile } from "@corely/contracts";
import type { PeopleCopy } from "./people-copy";
import { peopleApi } from "./people-api";
export function StaffProfileForm({
  profile,
  copy: t,
  onReload,
}: {
  profile?: StaffProfile;
  copy: PeopleCopy;
  onReload: () => void;
}) {
  const navigate = useNavigate();
  const mounted = usePeopleMounted();
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState<{ fingerprint: string; key: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fields: Record<string, string | null> = {};
    for (const key of [
      "displayName",
      "jobTitle",
      "team",
      "location",
      "managerStaffId",
      "accountId",
      "partyId",
      "resourceId",
    ]) {
      fields[key] = String(form.get(key) ?? "").trim() || null;
    }
    const parsed = CreateStaffSchema.safeParse(fields);
    if (!parsed.success) {
      setError(true);
      return;
    }
    const body = { ...parsed.data, ...(profile ? { version: profile.version } : {}) };
    const fingerprint = JSON.stringify(body);
    const key = retry?.fingerprint === fingerprint ? retry.key : crypto.randomUUID();
    setRetry({ fingerprint, key });
    setBusy(true);
    setError(false);
    try {
      const saved = await peopleApi.command(
        profile ? `/${profile.id}` : "",
        profile ? "PATCH" : "POST",
        body,
        key
      );
      if (mounted.current) {
        navigate(`/people/staff/${saved.id}`);
      }
    } catch (error) {
      if (!mounted.current) {
        return;
      }
      setBlocked(error instanceof HttpError && [403, 409].includes(error.status ?? 0));
      setError(true);
    } finally {
      if (mounted.current) {
        setBusy(false);
      }
    }
  }
  const field = (key: keyof StaffProfile, label: string, required = false) => (
    <div className="space-y-2" key={key}>
      <Label htmlFor={`staff-${key}`}>{label}</Label>
      <Input
        id={`staff-${key}`}
        name={key}
        defaultValue={String(profile?.[key] ?? "")}
        required={required}
        maxLength={160}
        autoComplete="off"
      />
    </div>
  );
  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="space-y-6 rounded-lg border bg-card p-5 sm:p-6"
    >
      {error && (
        <div role="alert" className="space-y-2 text-destructive">
          <p>{t.changed}</p>
          <Button type="button" variant="outline" onClick={onReload}>
            {t.reload}
          </Button>
        </div>
      )}
      <fieldset disabled={busy || blocked} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          {field("displayName", t.name, true)}
          {field("jobTitle", t.job)}
          {field("team", t.team)}
          {field("location", t.location)}
          {field("managerStaffId", t.manager)}
        </div>
        <details
          className="rounded-lg border p-4"
          open={Boolean(profile?.accountId || profile?.partyId || profile?.resourceId)}
        >
          <summary className="cursor-pointer font-medium">{t.links}</summary>
          <p className="my-3 text-sm text-muted-foreground">{t.linksHint}</p>
          <div className="grid gap-5 sm:grid-cols-2">
            {field("accountId", t.account)}
            {field("partyId", t.party)}
            {field("resourceId", t.resource)}
          </div>
        </details>
        <div className="flex gap-3">
          <Button type="submit">{busy ? t.saving : t.save}</Button>
          <Button asChild variant="outline">
            <Link to={profile ? `/people/staff/${profile.id}` : "/people/staff"}>{t.cancel}</Link>
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
