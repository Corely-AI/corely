---
name: release
description: Prepare or execute explicitly requested Corely deployment, redeploy or rollback using verified repository workflows and runtime evidence. PR creation and ticket work do not themselves authorize a release.
---

# Release Corely

Read [AGENTS](../../../AGENTS.md), the requested environment/surface/action,
[current deployment workflow](../../../.github/workflows/deploy.yml),
[CI](../../../.github/workflows/ci.yml), affected Docker/configuration files and owner runbooks.
For OpenBuk use [its deployment notes](../../../docs/products/openbuk/README.md).

1. Separate preparation from requested execution. Resolve actual environment, source SHA, selected
   surfaces/artifacts, configuration, migration needs and rollback from current evidence. Preserve
   already explicit authorization for its scope; do not infer production deployment from a PR.
2. Discover the current remote/default branch and actual workflow triggers/inputs. The inspected
   default is `development` while checked-in CI/deploy push triggers name `main`. Deployment YAML
   still has historical worker/configuration references; do not assume they match effective runtime.
   Reconcile a material mismatch before execution and report the exact unresolved operation. Do
   not recreate `services/worker` or import another repository's deployment labels/ticket engine.
3. Verify authenticated access, exact-source checks, artifact identity, current traffic/revision,
   actual environment bindings and data compatibility. Keep secrets as references/redacted facts.
   Saved config, successful build and workflow presence do not prove deployed consumption.
4. For authorized execution use the existing supported mechanism with deliberate inputs. The
   checked-in deploy workflow also runs a database migration job after API deployment; inspect
   actual rollout compatibility/order before invoking it. Do not silently migrate a shared target,
   change IAM, bypass protection or broaden a deployment to unrelated clients. Do not install a
   new release infrastructure just to satisfy this procedure.
5. Follow the run to a verified outcome. Check exact image/revision, traffic/readiness, configuration
   and migration result, then the requested public/authenticated user path. For rollback, verify
   code/database compatibility; application rollback does not undo persisted data.
6. On partial/ambiguous failure inspect the existing run and runtime before retrying. Preserve
   successful components, reconcile whether effects already happened, and retry only the safe
   missing operation within authorization. Do not blindly rerun a workflow or roll back a healthy
   runtime to repair reporting metadata.

Return environment/action, source/artifact identity, run/runtime links, verification and remaining
limits. Preparation stops at the reviewable plan when execution was not requested. This skill
creates no standing authorizations, release quotas, named-operator gates or external announcements.
