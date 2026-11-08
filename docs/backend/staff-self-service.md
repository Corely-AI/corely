# Staff self-service and controlled departure

[PEOPLE-04 (#308)](https://github.com/Corely-AI/corely/issues/308) extends the
[People directory](people.md), [working patterns](people-availability.md) and
[employee Tasks](employee-tasks.md). It adds no tables, migrations, account type,
payroll, absence handling, automatic access grants or external messages.

## Own records

OpenBuk `/app/me` and administration `/people/me` share the portable
`@corely/web-features/modules/people/self-service` component. The backend resolves
the active People profile linked to the authenticated account in the actual
tenant/workspace. A caller cannot choose another profile as their subject.

- `GET /people/me` requires current `people.self.read` and enabled People.
- `PATCH /people/me` additionally requires `people.self.update`. Only display name,
  personal email and personal phone can change. Responsibilities, manager, account,
  Party/resource links, roles and workspace ownership cannot change through this API.
- Updates require the resolved `profileId`, profile version and contact version.
  The profile ID is a precondition, never authority: a pending draft cannot adopt a
  different profile after a workspace switch or account relink.
- Projections contain neutral profile fields, own personal contacts, published working
  patterns and the currently accessible onboarding task. Manager notes, account/Party
  IDs, personnel files, audit history and customer booking details are absent.
- New default Staff roles receive own read/update. Read Only receives own read and
  sees no edit control. Existing custom roles need explicit grants; no role backfill
  or permission removal occurs as a side effect of onboarding.

Working patterns are read-only here. The last five published plans can be expanded
with localized weekdays, timezone and dated exceptions. A manager continues to own
schedule changes and their Booking impact review.

## Manager approval and follow-up

The existing Staff detail links to `/people/staff/:id/lifecycle`. Managers need
`people.directory.read` and `people.profile.manage` in the current workspace.

- `GET /people/staff/:id/lifecycle` reviews onboarding, unfinished tasks, future
  recurring assignments, future Booking commitments and workspace membership status.
- `POST /people/staff/:id/onboarding` approves a title and one to ten checklist
  steps against the current profile version. Current Tasks read/manage access and
  app enablement are checked by the Tasks owner inside the transaction.
- Tasks creates **one ordinary task with a checkbox snapshot** assigned to the
  active staff profile. People stores only its task ID and approval timestamp.
  Staff check/complete it in the existing Daily Work flow. No login, membership or
  sensitive permission is granted. Only one onboarding checklist can be linked;
  task history survives reassignment and departure. A former assignee cannot read
  a reassigned task through self-service.
- `POST /people/staff/:id/offboard` archives the profile with its expected version
  and an explicit `disableWorkspaceAccess` boolean. Archival preserves bookings,
  holds, tasks, checklist progress and identity links for historical interpretation.
  Reassignment and booking changes remain separate owning-app actions.

Departure shows up to 50 unfinished tasks with the total count, future recurring
plans that still assign this profile, and Booking's neutral commitment timestamps.
Superseded recurring plans do not report obsolete assignees. If Tasks access is
unavailable, the UI says so instead of suggesting there is no assigned work.

Optional access disablement uses a narrow **Workspaces-owned adapter**. It requires
the actor's current actual workspace OWNER/ADMIN membership, rejects self and OWNER
targets, and changes only the selected workspace membership status. A People manager
without that authority can archive and see active access as follow-up. An authorized
admin can revisit an archived profile to disable access later. Global Identity
accounts, tenant memberships/roles and other workspaces are preserved.

Archived profiles cannot use self-service. A disabled workspace membership also
denies guarded Tasks, personnel and known private-file routes with the old token.
This slice adds no personnel file grant or new download route; private absence/file
work in #307 remains separate.

## Reliability and client state

Every command requires `Idempotency-Key` or `X-Idempotency-Key`. Strict shared Zod
contracts reject extra fields. Actor/workspace-scoped replay stores fingerprints and
record IDs, not private response snapshots. Retries reauthorize the current subject
and return its current projection. A replayed departure rechecks workspace admin
authority but never disables an account again after a later reactivation.

Mutations, replay markers, audit and neutral outbox facts commit atomically. Lifecycle
commands coordinate Tasks → People → Booking → workspace membership locks; owner
adapters share the transaction. Self edits coordinate through the People lock and
recheck the subject and current permissions after acquiring it. Extension storage
holds the profile/contact data, lifecycle links and replay records; Tasks retains
its own task records. No module reads another owner's tables directly.

Responses use `private, no-store`. Shared UI clients capture the workspace in their
request headers. Projections, drafts and retry keys stay in component memory scoped
to the actor/workspace/subject. Scope changes hide the previous projection and ignore
late responses; denied reads/writes clear private drafts. Conflicts keep drafts until
the user reloads, and uncertain network failures can retry the same command safely.

The API-hosted outbox validates and acknowledges People lifecycle and workspace
disable facts. It does not send notifications or trigger unconfigured automation.
No new AI tools or employment decisions are introduced.

## Verification

The [delivery record](../tasks/308-staff-self-service.md) records fresh commands,
counts, screenshots and limits. SQL fixtures require disposable `people_test_*` and
`tasks_test_*` databases and use current Staff/Manager roles, two tenants and multiple
workspaces. The OpenBuk Playwright journey uses a separate `openbuk_test_*` database
and a local administration client with external delivery disabled. These checks do
not establish deployment, provider delivery, native mobile behavior or pilot adoption.
