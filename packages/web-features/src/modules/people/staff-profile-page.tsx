import { StaffAbsences } from "./staff-absences";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Button, Badge } from "@corely/ui";
import { ConfirmDeleteDialog } from "@corely/web-shared/shared/crud";
import type { StaffProfile } from "@corely/contracts";
import { peopleApi } from "./people-api";
import { usePeopleAccess, usePeopleLoad, usePeopleMounted } from "./use-people";
import { StaffProfileForm } from "./staff-profile-form";
import { StaffAvailability } from "./staff-availability";
import { StaffPrivateDetails } from "./staff-private-details";
export function StaffProfilePage() {
  const access = usePeopleAccess();
  const { id } = useParams<{ id: string }>();
  const { pathname } = useLocation();
  const routeKey = JSON.stringify([access.scope, pathname]);
  const mounted = usePeopleMounted(routeKey);
  const create = pathname.endsWith("/new");
  const editing = create || pathname.endsWith("/edit");
  const manage = access.can("profile.manage");
  const t = access.copy;
  const result = usePeopleLoad(
    (signal) => peopleApi.detail(id ?? "", manage, signal),
    `${access.scope}:${id}:${manage}:${pathname}`,
    !create && !access.loading && access.can("directory.read")
  );
  const [archiveTarget, setArchiveTarget] = useState<{
    id: string;
    version: number;
    routeKey: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const profile = result.data;
  const archiveOpen = Boolean(
    archiveTarget &&
    archiveTarget.routeKey === routeKey &&
    archiveTarget.id === id &&
    manage &&
    profile &&
    !profile.archivedAt
  );
  useEffect(() => {
    setArchiveTarget(null);
    setBusy(false);
    setFailed(false);
  }, [routeKey]);
  if (access.loading) {
    return <p role="status">{t.loading}</p>;
  }
  if (!access.can("directory.read") || (editing && !manage)) {
    return <p role="alert">{t.denied}</p>;
  }
  const reload = () => {
    setFailed(false);
    result.reload();
  };
  const archive = async () => {
    if (
      !archiveTarget ||
      archiveTarget.routeKey !== routeKey ||
      archiveTarget.id !== id ||
      !manage
    ) {
      return;
    }
    setBusy(true);
    try {
      await peopleApi.command(
        `/${archiveTarget.id}/archive`,
        "POST",
        { version: archiveTarget.version },
        crypto.randomUUID()
      );
      if (mounted.current) {
        reload();
      }
    } catch {
      if (!mounted.current) {
        return;
      }
      setFailed(true);
      result.reload();
    } finally {
      if (mounted.current) {
        setBusy(false);
        setArchiveTarget(null);
      }
    }
  };
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Link className="text-sm underline" to="/people/staff">
        ← {t.back}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">
          {create ? t.newTitle : (profile?.displayName ?? t.details)}
        </h1>
        {profile && <Badge variant="outline">{profile.archivedAt ? t.archived : t.active}</Badge>}
      </div>
      {failed && (
        <div role="alert">
          {t.changed}
          <Button variant="outline" onClick={reload}>
            {t.reload}
          </Button>
        </div>
      )}
      {create ? (
        <StaffProfileForm copy={t} onReload={() => window.location.reload()} />
      ) : result.loading ? (
        <p role="status">{t.loading}</p>
      ) : result.error ? (
        <div role="alert">
          {t.error}
          <Button variant="outline" onClick={reload}>
            {t.retry}
          </Button>
        </div>
      ) : (
        profile && (
          <>
            {profile.archivedAt && <p className="rounded-lg bg-muted p-4">{t.archivedHint}</p>}
            {editing && !profile.archivedAt ? (
              <StaffProfileForm
                key={`${profile.id}:${profile.version}`}
                profile={profile as StaffProfile}
                copy={t}
                onReload={reload}
              />
            ) : (
              <>
                <section className="space-y-5 rounded-lg border bg-card p-5 sm:p-6">
                  <dl className="grid gap-5 sm:grid-cols-2">
                    {[
                      [t.job, profile.jobTitle],
                      [t.team, profile.team],
                      [t.location, profile.location],
                      [t.manager, profile.managerStaffId],
                      [t.resource, profile.resourceId],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-sm text-muted-foreground">{label}</dt>
                        <dd className="break-words font-medium">{value || t.none}</dd>
                      </div>
                    ))}
                  </dl>
                  {manage && (
                    <p className="text-sm text-muted-foreground">
                      {"accountId" in profile && profile.accountId ? t.linkedAccount : t.noAccount}
                    </p>
                  )}
                  {manage && !profile.archivedAt && (
                    <div className="flex flex-wrap gap-3">
                      <Button asChild>
                        <Link to={`/people/staff/${profile.id}/edit`}>{t.edit}</Link>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          setArchiveTarget({ id: profile.id, version: profile.version, routeKey })
                        }
                      >
                        {t.archive}
                      </Button>
                    </div>
                  )}
                </section>
                {manage && (
                  <StaffAvailability
                    key={`${access.scope}:${profile.id}`}
                    id={profile.id}
                    archived={Boolean(profile.archivedAt)}
                  />
                )}
                <StaffAbsences
                  id={profile.id}
                  archived={Boolean(profile.archivedAt)}
                  onSaved={reload}
                />
                <StaffPrivateDetails
                  key={`${access.scope}:${profile.id}:${access.can("private.read")}`}
                  id={profile.id}
                  scope={access.scope}
                  copy={t}
                  onSaved={reload}
                  read={access.can("private.read")}
                  manage={manage && access.can("private.manage") && !profile.archivedAt}
                />
              </>
            )}
          </>
        )
      )}
      <ConfirmDeleteDialog
        trigger={null}
        title={t.archiveTitle}
        description={t.archiveHint}
        confirmLabel={t.archive}
        cancelLabel={t.cancel}
        open={archiveOpen}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveTarget(null);
          }
        }}
        isLoading={busy}
        onConfirm={archive}
      />
    </div>
  );
}
