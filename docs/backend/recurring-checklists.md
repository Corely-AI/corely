# Recurring checklists

[TASK-03 (#314)](https://github.com/Corely-AI/corely/issues/314) extends [employee Tasks](employee-tasks.md)
with recurring opening/closing routines. A manager publishes one template; **each eligible
assignee receives one task per scheduled local date, containing copied checklist checkboxes**.
A task can be completed only after all its steps are checked. Reopening retains checked steps;
uncheck them explicitly when redoing work. Checking/completing a task never changes its template.
No AI, outbound notifications, comments/files, board, new deployment or database migration is added.

## Manager and assignee flows

Open **Daily Work → Recurring checklists** at `/app/tasks/templates` in OpenBuk or
`/tasks/templates` in administration. Shared public feature exports serve both clients,
with English, German and Vietnamese copy. Assignees work in the existing Daily Work list.
Template access and every command require current `tasks.read` + `tasks.manage`, Tasks and
People installed/effectively enabled, and trusted current tenant/workspace membership.
Assignees need `tasks.read` + `tasks.own.update` and an active linked People profile to update
only their own task. Existing role/provisioning requirements remain unchanged.

Publish a title, 1–10 steps, 1–20 active same-workspace assignees, selected weekdays (all seven
means daily), IANA timezone, local due minute and effective dates. End dates are inclusive.
First publication may start today; edits start tomorrow or later in the template's timezone.
The timezone is fixed: publish another template to change it. A new plan replaces a pending
future plan while retaining historical plans. History is bounded to 50 plans/100 pause intervals;
publish another template if the limit is reached. Existing instances retain their original steps,
provenance, due instant and ID. Managers may still edit/reassign an individual task explicitly.

**Generate today** is a guarded manual command that works without a configured scheduler.
Review **Recent occurrences** for generated counts and neutral skip outcomes. Publication alone
does not establish that scheduled background execution has been configured in a deployed environment.

## Deterministic local-date policy

- One immutable occurrence marker per tenant/workspace/template/local date. Task IDs additionally
  include the assignee. Revision is excluded, preventing duplicate instances after edits or replay.
- A run evaluates today and the previous two local dates. Older missed dates expire without
  backfill or persisted markers. Tasks are generated during their local day, with the configured
  due time; generation does not wait until that due minute.
- Nonexistent DST due minutes are recorded as `CLOCK_GAP`; repeated minutes choose the first
  actual instant. Local dates, leap days, midnight transitions and half-hour offsets are tested.
- **Pause** stops new generation immediately. **Resume tomorrow** closes the pause through the
  current local day; catch-up respects recorded pause intervals. Existing tasks remain.
  **End permanently** stops all future generation/catch-up and preserves existing work.
- **Skip date** creates an immutable `MANUAL` marker for a scheduled date from today minus two
  through today plus 365 days. A generated day cannot be skipped retroactively; manage its
  tasks instead. A skipped occurrence is never regenerated; create an ad-hoc task if needed.
- Missing/archived People profiles are skipped as `INACTIVE`. A published People working pattern
  with no available work window on the template date yields `NOT_AVAILABLE`. No effective
  published pattern leaves checklist assignment unrestricted. Only neutral eligibility crosses
  the People public port; personnel reasons and schedule details never appear in task responses.
- Background generation revalidates the publishing manager's current authority for each day.
  Revoked management/workspace/app access produces `PUBLISHER_ACCESS`; a currently authorized
  manager may publish the next future plan. There is no autonomous escalation of authority.

## API, persistence and execution

Authenticated, `private, no-store` manager routes:

- `GET /tasks/recurring?page=1&pageSize=25` (maximum 50) and `GET /tasks/recurring/:id`.
- `POST /tasks/recurring`: strict `PublishChecklist` contract.
- `POST /tasks/recurring/:id/edit`: `{version, plan}`; plan uses the publication fields.
- `POST /tasks/recurring/:id/pause|resume|end|generate`: `{version}`.
- `POST /tasks/recurring/:id/skip`: `{version, localDate}`.
- `POST /tasks/:id/checklist/:stepId`: `{version, completed}` under the task's existing owner policy.

All commands require `Idempotency-Key` or its existing alias. Stale versions/key-payload reuse
return 409. Replays reauthorize and return the current projection, including later completion.
Each day serializes under Tasks and People workspace locks. All assignee tasks, occurrence marker,
audit, outbox facts and manual replay marker commit together; failures roll everything back.
Template and task events are validated/acknowledged by the existing API-hosted outbox without
external delivery. The app-install adapter accepts both direct and legacy wrapped transaction
contexts so command authorization stays on its active connection even when the pool is full.

Storage remains `ext.kv`, `moduleId=tasks`, with actual tenant and `workspace:<id>:` scopes:
`recurring-templates`, `recurring-occurrences:<template-id>` and `recurring-commands`. Each template
stores its next evaluation instant; background discovery scans only this owner's template scope.
A tick selects at most 25 templates, evaluates at most three dates each and has a 30-second budget.
Active templates are reconsidered after five minutes, including after a failed day. Skipped and
generated markers prevent retry duplication. No separate timer, worker or scheduler service is created.

The existing scheduled `POST /internal/background/outbox/run` tick also evaluates recurrence **only
when existing background service credentials are configured**. A dedicated
`POST /internal/background/tasks/recurring/run` with `{limit: 1..25}` uses the same runtime and
fails closed unless `WORKER_API_SERVICE_TOKEN` (`x-service-token`) or the legacy configured
`INTERNAL_WORKER_KEY` (`x-worker-key`) authorizes it. Do not expose a service credential to clients.
The legacy outbox route's broader optional-key behavior is unchanged; unconfigured calls acquire
no recurrence write authority. Enabling deployed scheduler credentials/traffic remains release work.

## Evidence and limits

See [#314 delivery record](../tasks/314-recurring-checklists.md) for actual fresh checks and UI evidence.
SQL tests require a disposable `TASKS_TEST_DATABASE_URL` named `tasks_test_*`; browser tests use a
separate `OPENBUK_TEST_DATABASE_URL` named `openbuk_test_*` and separately started local clients/API
with external delivery disabled. The recurrence browser suite also requires
`TASKS_RECURRING_SERVICE_TOKEN` matching that test API's configured service token. These checks
establish bounded local behavior, not production scheduler activation or large-volume performance.
