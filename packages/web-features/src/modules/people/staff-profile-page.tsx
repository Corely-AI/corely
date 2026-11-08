import { staffJourneyCopy } from "./staff-journey-copy";
import { Link, useLocation, useParams } from "react-router-dom";
import { Button, Badge } from "@corely/ui";
import type { StaffProfile } from "@corely/contracts";
import { peopleApi } from "./people-api";
import { usePeopleAccess, usePeopleLoad } from "./use-people";
import { StaffProfileForm } from "./staff-profile-form";
import { StaffAvailability } from "./staff-availability";
import { StaffPrivateDetails } from "./staff-private-details";
export function StaffProfilePage() {
  const access = usePeopleAccess();
  const { id } = useParams<{ id: string }>();
  const { pathname } = useLocation();
  const create = pathname.endsWith("/new");
  const editing = create || pathname.endsWith("/edit");
  const manage = access.can("profile.manage");
  const t = access.copy;
  const result = usePeopleLoad(
    (signal) => peopleApi.detail(id ?? "", manage, signal),
    `${access.scope}:${id}:${manage}:${pathname}`,
    !create && !access.loading && access.can("directory.read")
  );
  const profile = result.data;
  const journey =
    staffJourneyCopy[access.locale === "de" || access.locale === "vi" ? access.locale : "en"];
  if (access.loading) {
    return <p role="status">{t.loading}</p>;
  }
  if (!access.can("directory.read") || (editing && !manage)) {
    return <p role="alert">{t.denied}</p>;
  }
  const reload = () => result.reload();
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
                    </div>
                  )}
                  {manage && (
                    <p className="mt-4">
                      <Link className="underline" to={`/people/staff/${profile.id}/lifecycle`}>
                        {journey.lifecycle} →
                      </Link>
                    </p>
                  )}
                </section>
                {manage && (
                  <StaffAvailability
                    key={`${access.scope}:${profile.id}`}
                    id={profile.id}
                    archived={Boolean(profile.archivedAt)}
                  />
                )}
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
    </div>
  );
}
