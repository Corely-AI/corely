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
