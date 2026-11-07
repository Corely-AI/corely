# 301: Compose the package using existing app manifests

## Tracking and outcome

- Issue: [PLAT-01 / #301](https://github.com/Corely-AI/corely/issues/301).
- Parent: [EP-PLATFORM / #282](https://github.com/Corely-AI/corely/issues/282).
- Prerequisites #298 and #299 integrated through PRs #365 and #366.
- Branch: `301-compose-operational-package`; PR base: `development`, verified
  remote `corely` (`Corely-AI/corely`). Inspected base:
  `1bdae26ddd43ac1d0e4bad0cd754139f7b2186b5`, 7 November 2026.
- Worktree: `/Users/hadoan/Documents/GitHub/worktrees/corely-301-compose-operational-package`.
  The clean, merged #299 worktree was deleted at the user's request; concurrent
  uncommitted #302 work in the primary checkout was preserved.
- Goal: expose scoped package configuration for Schedule, Team and Daily Work
  using actual manifests and distinct access gates without finance prerequisites.
- Exclusions: new app owners, employee/task/absence implementation, shell UI,
  persisted setup selection, migrations, deployment and broader #302 access work.

## Reuse and implementation

[Maintained behavior](../platform/operational-package.md) extends the existing
workspace config endpoint, shared client/contracts, manifest registry,
dependency resolver, experience evaluator and effective entitlement reader.

- Opt-in `packageId=internal-operations` computes the OpenBuk package response
  without auto-installing finance or any other apps. Existing requests retain
  their defaults. This selector is presentation, not stored authority.
- Booking contributes Schedule using its actual `booking` ID and existing `/app`.
  Team/Daily Work are explicitly unavailable until owning features contribute;
  no placeholder modules, renamed identities or broken links are introduced.
- The current OpenBuk free-product feature is registered in the existing catalog
  and checked independently from app installation, workspace capability and user
  permission/membership. No subscription product or entitlement engine is added.
- Disabled optional installs remain disabled during legacy config reads; no
  record/configuration deletion is introduced.

## Verification

| Command / check                                      | Result and limits                                                                                                |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Configuration integration + related regression tests | PASS: 35 tests in six files, including eight new in-memory configuration cases. No DB/provider/browser was used. |
| `pnpm --filter @corely/contracts typecheck`          | PASS.                                                                                                            |
| `pnpm --filter @corely/api typecheck`                | PASS.                                                                                                            |
| `pnpm --filter @corely/web-shared typecheck`         | PASS.                                                                                                            |
| Targeted ESLint                                      | PASS: zero errors; existing unused import / controller `any` warnings remain.                                    |
| `pnpm lint`                                          | Initial repository-wide run exhausted the configured 8 GB JS heap; 12 GB hook-equivalent retry pending.          |
| `pnpm arch:check`                                    | BLOCKED by unchanged checker: ENOENT for removed `services/worker/src`, before architecture assertions.          |
| Formatting, local links and full diff                | PASS: installed Prettier, 94 local references/anchors, whitespace and scoped diff review.                        |

The focused command (from repository root) is:

```sh
DATABASE_URL=postgresql://test:test@127.0.0.1:1/corely_301_inmemory \
APP_ENV=test WORKFLOW_QUEUE_DRIVER=memory \
WORKFLOW_CLOUDTASKS_TARGET_BASE_URL=http://localhost \
SPEECH_TO_TEXT_PROVIDER=none OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost \
pnpm --dir services/api exec vitest run --config vitest.config.ts \
  src/modules/platform/__tests__/operational-package-configuration.spec.ts \
  src/modules/platform/__tests__/menu-builder.service.spec.ts \
  src/modules/platform/__tests__/workspace-template.service.spec.ts \
  src/modules/platform/__tests__/workspace-experience-resolver.service.spec.ts \
  src/modules/platform/__tests__/tenant-entitlement-gating.spec.ts \
  src/modules/booking/__tests__/openbuk-availability.spec.ts \
  --maxWorkers=1 --minWorkers=1
```

The dummy URL satisfies import-time environment validation only; tests use
in-memory adapters and never connect to it. The first attempt without a dummy
URL stopped on required `DATABASE_URL` validation; the configured run above passed.
Installed dependencies were reused through ignored worktree-local symlinks.
No migrations, real database, provider calls or outbound delivery were run.

## UI/UX evidence

N/A: backend/shared contracts and client query support; no component, rendered
screen or frontend route changes. PLAT-03 owns consuming the package metadata
in the selected surface and its screenshots/interaction acceptance.

## Impact and remaining work

Wire changes are additive and opt-in. Existing disabled installs are preserved
instead of silently re-enabled by a read. No storage/schema changes; rollback
is reverting the change. Keep the PR Draft pending normal review/integration.
Do not infer completed Team/Daily Work, persisted setup, backend-wide access
enforcement or pilot readiness from successful configuration checks.
