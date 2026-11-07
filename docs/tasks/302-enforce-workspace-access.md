# 302: Operational roles and private-data access

## Tracking and outcome

- Issue: https://github.com/Corely-AI/corely/issues/302; parent #282; prerequisite #298 complete.
- Branch: `302-enforce-workspace-access`; base: `development` at `4ed3292a2c556cff9d13b2cb6c85672be48fb2f3`.
- PR: not created yet.
- Outcome: current membership and role grants authorize authenticated workspace operations, independent of menu/capability visibility or stale token roles.
- Scope: existing Identity/Workspaces authorization, private permission defaults, document access and copilot execution boundaries. No People records, new schemas, migrations or UI.

## Reuse and plan

Reuse GetEffectivePermissionsUseCase, AuthorizeWorkspaceUseCase, RBAC metadata, permission catalog and tool registry. Resolve membership/grants freshly rather than cache permission decisions. Preserve trusted public workspace resolution and configured automation.

Document the action/resource/field policy and current legacy storage limitations. Test authentication context, tenant/workspace switching, membership/role revocation, private grants and tool/file gates using synthetic fixtures. Record actual checks and limits before draft PR handoff.

## Verification

Synthetic checks use no personnel data or external messages. Actual results:

- Focused API/controller/tool/context/workspace tests plus the full AppModule DI smoke suite: **46 passed**, using the API Vitest config and one worker. Final cases cover two valid tenants/workspaces, same-tenant switching, role/membership revocation, explicit-deny precedence, host grants, production header spoofing, direct signed-file access and tool execution after revocation.
- `pnpm --filter @corely/api typecheck`: passed. Separate TypeScript compilation of both new/extended test fixtures (normally excluded from the API tsconfig): passed.
- Root `pnpm test:unit`: 263 suites passed, 1 suite failed during setup; 1,065 tests passed, 8 skipped. The unchanged `confirm-handoff.integration.spec.ts` fails its initial Prisma `cashWorkspaceHandoff.deleteMany()` against the hard-coded local cash E2E database. This is not a passing full-suite result. Earlier failures caused by raw-header identities and tenant/workspace conflation were corrected in their fixtures.
- Root `pnpm lint`: failed at its configured 8 GB JavaScript heap limit. Changed production TypeScript is checked separately; the repository ignores spec/test files for ESLint, so those fixtures are typechecked and executed instead.
- `pnpm arch:check`: blocked by the unchanged checker scanning absent `services/worker/src`. No worker service was created to satisfy this historical path.
- `pnpm build:api`: passed, including required dependency-output guard (optional CJS output warnings only).
- Changed-file ESLint: zero errors; existing unused/explicit-any warnings remain in unchanged lines, and test/spec files are ignored by the repository configuration. Changed-file Prettier: passed.
- Seven targeted documentation links resolve; staged whitespace passed before commit.

Reproduce the focused run from the repository root:

```sh
APP_ENV=test WORKFLOW_QUEUE_DRIVER=memory \
WORKFLOW_CLOUDTASKS_TARGET_BASE_URL=http://localhost \
SPEECH_TO_TEXT_PROVIDER=none OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost \
pnpm --dir services/api exec vitest run --config vitest.config.ts \
  src/modules/identity/__tests__/operational-access.spec.ts \
  src/modules/ai-copilot/__tests__/tools.factory.spec.ts \
  src/__tests__/di-smoke.int.test.ts \
  src/modules/workspaces/application/use-cases/authorize-workspace.spec.ts \
  src/shared/request-context/__tests__/request-context.resolver.spec.ts \
  --maxWorkers=1 --minWorkers=1
```

No browser E2E, deployed validation or full database-integration suite is claimed. No migration, seed, release or production action was performed.

## UI/UX evidence

N/A: backend authorization and policy documentation only.

## Impact and remaining work

The [operational policy](../platform/operational-access.md) defines the action/resource/field matrix and existing owner boundaries. All roles require stored grants; system-role names add no permission bypass. Copilot takes one fresh snapshot for prompt filtering and revalidates each execution separately.

#302 remains open: this PR supplies common enforcement and policy, but private People projections/search/cache/export and personnel attachment ownership do not exist yet and require owner-level acceptance tests. The synthetic directory fixture is not a deployed private-field redactor. Generic document records are still tenant-owned, and previously issued signed URLs remain valid until storage expiry.

Existing clients must supply a genuine workspace selector when a workspace is needed. Tenant IDs are not fabricated workspace IDs. Authentication alone does not authorize private document access. Rollback is reverting the code; no data migration.
