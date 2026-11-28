---
name: release
description: Prepare or execute explicitly requested Corely deployments, redeployments, or rollbacks, including the app.corely.one CLI release on Vercel, Cloud Run, and Supabase. PR creation and ticket work do not themselves authorize a release.
---

# Release Corely

Read [AGENTS](../../../AGENTS.md), the requested environment/surface/action,
affected Docker/configuration files and owner runbooks. The
[GitHub Actions workflows](../../../backup/github-actions/README.md) are archived.
For OpenBuk use [its deployment notes](../../../docs/products/openbuk/README.md).
For `app.corely.one` and its production API, use the [production CLI runbook](references/app-corely-one-cli.md).

1. Separate preparation from requested execution. Resolve actual environment, source SHA, selected
   surfaces/artifacts, configuration, migration needs and rollback from current evidence. Preserve
   already explicit authorization for its scope; do not infer production deployment from a PR.
2. Verify the remote and deployment inputs. For production deployments, fetch the remote `main`
   branch and verify the selected commit is on it. Stop if the branch is missing or the selected
   commit cannot be verified. Compare the runbook's environment bindings with the live service.
   Reconcile material mismatches before execution. Background execution belongs to the API service.
3. Verify authenticated access, exact-source checks, artifact identity, current traffic/revision,
   actual environment bindings and data compatibility. Keep secrets as references/redacted facts.
   Saved config, successful build and workflow presence do not prove deployed consumption.
4. Before executing an authorized release, create a dedicated release ticket or use the ticket
   already tracking that exact release. Record the version, target environment, source commit and
   planned migrations. Start the release manually from the local computer using the runbook for
   the selected surface. Keep releases and remote migrations out of CI/CD automation for now.
   Keep the rollout within the authorized surfaces and access boundaries. Verify rollout
   compatibility and migration order before changing shared state.

   Apply pending Prisma migrations to remote Supabase only when releasing a new version. Use
   `prisma migrate deploy` from the release checkout after verifying the target and migration
   history. PR work, same-version redeployments and rollbacks must never apply remote migrations.

5. Follow the run to a verified outcome. Check exact image/revision, traffic/readiness, configuration
   and migration result, then the requested public/authenticated user path. For rollback, verify
   code/database compatibility; application rollback does not undo persisted data.
6. On partial/ambiguous failure inspect the existing run and runtime before retrying. Preserve
   successful components, reconcile whether effects already happened, and retry only the safe
   missing operation within authorization. Do not blindly rerun a workflow or roll back a healthy
   runtime to repair reporting metadata.

Return the release ticket, environment/action, source/artifact identity, run/runtime links,
verification and remaining limits. Preparation stops at the reviewable plan when execution was
not requested. This skill creates no standing authorizations, release quotas, named-operator gates
or external announcements.
