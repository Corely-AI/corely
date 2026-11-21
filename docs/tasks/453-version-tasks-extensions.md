# 453 Versioned Tasks extensions

This is the Tasks slice of [rollout #440](https://github.com/Corely-AI/corely/issues/440).
The app ID is `tasks`, with a manifest dependency on `people`. Backoffice and
OpenBuk use the shared Daily Work form. Tasks retains its stored task and
checklist records. People retains staff records and assignment authority.

The Tasks package owns the pure transition rules and the manual creation
extension. Register the policy in `task-creation-extensions.ts` for a tenant
and workspace. An example checks for a due date. Only the due-date field reaches
the extension. Staff permissions and assignment checks still run, and repeat
requests return their existing result before applying the new rule. The hook is
outside the checklist materializer. An optional UI contribution is registered in
`task-creation-guidance.ts` and rendered for the same workspace in both hosts.

Run the [release fixture](../testing/fixtures/tasks-upgrade/) through the shared
preview in [#446](https://github.com/Corely-AI/corely/pull/446). Retain the prior
verified API and web builds together. No database migration is required.

## Verification

Eight task and scope unit tests passed. API and web builds and typechecks,
package typechecks, and the frozen install passed.

One disposable PostgreSQL database was reused for 1.0 and 1.1. Existing Tasks
and their staff references remained readable. A retry of the original request
returned the existing task. The configured workspace rejected a new task with
no due date. The default workspace accepted it. A valid task was created and
completed. The candidate backend used 1.1.0 and the UI used 1.0.1 with the same
extension registration. The preview rejected UI 2.0.0.

Four browser cases passed on each version in Backoffice. The candidate also
passed four embedded OpenBuk browser cases. The Backoffice save action showed
the configured rejection and kept the draft open. OpenBuk screenshots use the
platform's light theme.

| Host and width     | Default                                                                 | Configured                                                             |
| ------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Backoffice 1280 px | [Default](../platform/evidence/tasks-upgrade-standard-1280.jpg)         | [Configured](../platform/evidence/tasks-upgrade-acme-1280.jpg)         |
| Backoffice 390 px  | [Default](../platform/evidence/tasks-upgrade-standard-390.jpg)          | [Configured](../platform/evidence/tasks-upgrade-acme-390.jpg)          |
| OpenBuk 1280 px    | [Default](../platform/evidence/openbuk-tasks-upgrade-standard-1280.jpg) | [Configured](../platform/evidence/openbuk-tasks-upgrade-acme-1280.jpg) |
| OpenBuk 390 px     | [Default](../platform/evidence/openbuk-tasks-upgrade-standard-390.jpg)  | [Configured](../platform/evidence/openbuk-tasks-upgrade-acme-390.jpg)  |
