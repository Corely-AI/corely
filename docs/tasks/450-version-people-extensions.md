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
