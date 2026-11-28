# 450 Versioned People extensions

This is the People slice of [rollout #440](https://github.com/Corely-AI/corely/issues/440).
The existing staff directory and editor share their routes between Backoffice and
focused HR. Staff continues to own its existing extension storage. Workspace
membership and People permissions remain prerequisites for every operation.

The People package holds the existing framework-independent profile rules and a
workspace-scoped extension point for managed staff creation and update. A customer
can require a team in its API registration and provide matching guidance in the
shared editor. The policy sees the operation and team only. It runs after authorized
idempotent replay and version checks, before writes or events. Private personnel
details, identity links, self-service, archives and lifecycle retain their owners.

The [fixture manifests](../testing/fixtures/people-upgrade/) pin the supported
customer extension and package revisions. Run the preview from
[#446](https://github.com/Corely-AI/corely/pull/446). Retain the prior verified API
and web builds as a pair for recovery. This slice introduces no migration.

## Verification

Five unit tests passed for the profile invariants and workspace policy. The API,
web and extension packages passed their builds or typechecks.

On one disposable PostgreSQL database, both the 1.0 and 1.1 builds retained the
existing profile and replayed its original request. The Acme registration required
a team on new creates and updates. The second workspace used the defaults. A
valid create and update succeeded. The preview accepted the package revisions and
rejected a test UI version of 2.0.0. The candidate backend used 1.1.0 and the UI
used 1.0.1 with the same extension configuration.

Four rendered Backoffice cases passed on each version. The configured desktop
case also saved, observed the policy failure, corrected the field and saved again.
The existing 11 focused HR Playwright scenarios also passed with their mock BFF transport. The configured policy was exercised against the real API through Backoffice.

| Width   | Default                                                                  | Configured                                                              |
| ------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| 1280 px | [Default desktop](../platform/evidence/people-upgrade-standard-1280.jpg) | [Configured desktop](../platform/evidence/people-upgrade-acme-1280.jpg) |
| 390 px  | [Default mobile](../platform/evidence/people-upgrade-standard-390.jpg)   | [Configured mobile](../platform/evidence/people-upgrade-acme-390.jpg)   |
