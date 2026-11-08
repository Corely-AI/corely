# Employee tasks

[TASK-01 (#312)](https://github.com/Corely-AI/corely/issues/312) adds a small Tasks owner
for daily employee work. It is separate from workflow execution tasks and CRM activities.
The same records appear at `/app/tasks` in OpenBuk and `/tasks` in the administration
client through the public `@corely/web-features/modules/tasks` feature. This slice does
not add comments, attachments, Projects, notifications delivery or AI tools.
[TASK-03 recurring checklists](recurring-checklists.md) extends these records with checkbox snapshots.

## Configuration and access

Tasks installation is an explicit Platform provisioning prerequisite. The existing app
controller is host-scoped; a tenant owner cannot self-install through that endpoint.
The browser fixture provisions only its own disposable tenant and does not relax that policy.
Tasks depends on People;
no financial app, subscription, booking publication or Projects installation is required.
Installation, effective app enablement, current tenant/workspace membership and permissions
are checked independently on the backend. Disabling either Tasks or People denies task access.
Existing custom roles need explicit grants for the new permissions.

| Permission                        | Behavior                                                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `tasks.read`                      | Read tasks owned by the caller's linked active staff profile                                                      |
| `tasks.read` + `tasks.manage`     | Read/create/assign/edit/check steps/complete/reopen tasks in the current workspace; list neutral active assignees |
| `tasks.read` + `tasks.own.update` | Check steps/complete/reopen only tasks owned by the caller's linked active staff profile                          |

New Owner/Admin default grants include all task permissions. Staff includes own completion;
Read Only never receives a task mutation grant. Existing roles are not silently rewritten.
An auth account, People staff profile and Booking resource remain distinct. Staff without
an account can own work; self-service requires an explicit People account link.

The People public operational lookup returns only staff ID, display name and archive state.
Its account-resolution method returns that same neutral projection. No personnel reasons,
contacts, account IDs or party IDs appear in task responses or assignee choices.

## Lifecycle and persistence

A task has an immutable ID and workspace, title (1–240 characters), required staff owner,
optional due instant, `OPEN`/`COMPLETED` status, version and timestamps. Due times must parse and normalize to a valid UTC wire instant (including offset/year bounds); clients display their device timezone explicitly. Completing records `completedAt`;
reopening clears it. Ordinary editing preserves status. New/reassigned owners must be active
in the same workspace. Existing archived owners retain their task history; managers can finish,
edit or reassign that work. Archival does not erase tasks or turn staff into login accounts.

Tasks uses existing `ext.kv`, with actual tenant ID, `moduleId = tasks` and separate
`workspace:<id>:records`/`:commands` scopes. No new table, schema or migration is introduced.
A stored assignment name provides a historical fallback; current neutral People names and
archive state are projected through its public interface. Extension storage is suitable for
this bounded slice; larger task volumes may justify a later measured storage/query change.

## API and reliability

All routes require authenticated trusted workspace context and return `private, no-store`.

- `GET /tasks?status=all|OPEN|COMPLETED&page=1&pageSize=30` (maximum page size 100).
- `GET /tasks/assignees` (managers only) and `GET /tasks/:id`.
- `POST /tasks`: title, ownerStaffId, optional dueAt.
- `PATCH /tasks/:id`: the complete editable fields and expected version.
- `POST /tasks/:id/complete` and `/reopen`: expected version.
- `POST /tasks/:id/checklist/:stepId`: expected version and completed boolean. Checklist completion requires all steps checked.

Every command requires `Idempotency-Key` (or the existing `X-Idempotency-Key` alias).
Unknown/privileged fields are rejected by shared strict Zod contracts. Commands serialize
within the tenant/workspace and coordinate assignment with People's archival write lock.
Current permission/app reads use the command transaction connection, bypassing entitlement
caches there. Stale versions or incompatible status transitions return 409. Repeated identical
commands return the current authorized record; changing a key's normalized payload returns 409.
Replay records are scoped by actor/workspace and store only fingerprint and record ID.

Task, audit (`tasks.task.create|update|complete|reopen|checklist`), outbox event and replay marker commit
or roll back together. Events contain workspace/task IDs and version, not titles or personnel
contacts. The existing API-hosted dispatcher explicitly acknowledges these five lifecycle facts after
validating their neutral payloads, so ordinary task writes do not enter its dead-letter queue.
Unknown event types and malformed facts remain failures. This acknowledgement has no outbound
notification or workflow side effect; future delivery consumers must extend it explicitly.
No separate worker or provider delivery is introduced.

## Verification and limits

See the [delivery record](../tasks/312-employee-tasks.md) for fresh checks and UI evidence.
The SQL suite requires an isolated `TASKS_TEST_DATABASE_URL` named `tasks_test_*`; it exercises
real HTTP guards, owners, persistence, concurrency, replay, privacy and rollback. The OpenBuk
Playwright journey uses a separately started API/client on a disposable `openbuk_test_*`
database with external delivery disabled. Those local checks do not establish pilot adoption,
production rollout, provider delivery or large-volume performance.
