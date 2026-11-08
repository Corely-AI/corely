# #383 — Launchable app catalog metadata

## Tracking and outcome

- Issue: [SURF-03 / #383](https://github.com/Corely-AI/corely/issues/383), parent [#380](https://github.com/Corely-AI/corely/issues/380).
- Prerequisite: [SURF-01 / #381](https://github.com/Corely-AI/corely/issues/381), closed with maintainer-approved host matrix; ADRs present in base.
- Branch: `383-launchable-app-catalog`; base: `corely/development` at `05e42f0ff8`.
- PR: pending publication.
- Goal: additive launch descriptors, safe configured destinations and a lightweight projection through the existing catalog.
- Excluded: frontend delivery, SSO/session implementation, live configuration, deployment, entitlement redesign and storage changes.

## Reuse and decisions

Existing `AppManifestSchema`, `AppCatalogItemSchema`, `AppRegistry` and
`GET /platform/apps` remain the owners. Invoice maps to `invoices`; HR maps to
`people`. Dependencies, installation IDs, menu contributions and permissions stay
in their original manifests. Backend-only modules do not acquire descriptors.

Focused contexts are scoped within `platform`; `SurfaceId` and platform/app aliases
remain compatible. Exact origin resolution is a navigation helper, not trusted
request authority or focused menu enforcement. See the maintained
[catalog contract/configuration guide](../backend/app-launch-catalog.md).

Both unreleased focused UIs are `coming-soon`. The administration projection
emits no URL for unreleased, disabled or unconfigured destinations. Once explicitly
released, a destination can only be the root of a validated deployment origin.
No tenant config, arbitrary path, workspace intent or return URL feeds generation.
The existing authenticated administration endpoint/permission is unchanged;
App Center's user entitlement projection remains a separate follow-on outcome.

`ListAppCatalogUseCase` moves listing out of the controller. Existing catalog
fields retain their previous meanings, including legacy manifest extras in the
null-tenant branch; that branch still projects launch metadata without a URL.

Changes were isolated in a worktree because the user's primary checkout contains
ongoing #384 work. Existing dependency directories were reused without installing
packages or modifying their builds. No application/database was started.

## Verification

Checks run 2026-11-08, using source aliases and existing installed dependencies:

| Command/check                                                                                                                                                                                                                                                                 | Result and limits                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm exec vitest run --workspace ./vitest.workspace.ts packages/contracts/src/__tests__/app-launch.schema.spec.ts packages/contracts/src/__tests__/surface.schema.spec.ts services/api/src/modules/platform/__tests__/list-app-catalog.usecase.spec.ts`                      | Passed: 23 tests. Old/new payloads, frozen old-client shape, runtime mappings, translations/categories, production/staging/local context/URL generation, unknown/unsafe inputs, tenant isolation and backend dependency exclusion. |
| `pnpm exec vitest run --workspace ./vitest.workspace.ts services/api/src/modules/platform/__tests__/menu-builder.service.spec.ts services/api/src/modules/platform/__tests__/tenant-entitlement-gating.spec.ts packages/contracts/src/__tests__/experience-evaluator.spec.ts` | Passed: 19 tests (run together with the configuration regression below on its initial attempt).                                                                                                                                    |
| `DATABASE_URL=postgresql://test:test@127.0.0.1:1/corely_test pnpm exec vitest run --workspace ./vitest.workspace.ts services/api/src/modules/platform/__tests__/operational-package-configuration.spec.ts`                                                                    | Passed: 9 tests, in-memory persistence. Initial collection failed without required `DATABASE_URL`; rerun uses a non-connecting synthetic value. No real DB used.                                                                   |
| `pnpm --filter @corely/contracts typecheck`                                                                                                                                                                                                                                   | Passed.                                                                                                                                                                                                                            |
| `pnpm --filter @corely/config typecheck`                                                                                                                                                                                                                                      | Passed.                                                                                                                                                                                                                            |
| `pnpm --filter @corely/api typecheck`                                                                                                                                                                                                                                         | Passed.                                                                                                                                                                                                                            |
| `pnpm exec eslint <changed production TypeScript files>`                                                                                                                                                                                                                      | Passed; spec files excluded by repository lint configuration.                                                                                                                                                                      |
| Installed Prettier on changed TS/Markdown; local documentation links; `git diff --check`                                                                                                                                                                                      | Passed: formatting on all changed TS/Markdown, two new-document local links plus docs-index destination, and clean whitespace.                                                                                                     |
| `pnpm arch:check`                                                                                                                                                                                                                                                             | Blocked: unchanged checker attempts to scan absent `services/worker/src` and exits ENOENT. No worker added or architecture tooling rewritten.                                                                                      |

Final provider/contract hardening rerun:
`pnpm exec vitest run --workspace ./vitest.workspace.ts packages/contracts/src/__tests__/app-launch.schema.spec.ts services/api/src/modules/platform/__tests__/list-app-catalog.usecase.spec.ts services/api/src/modules/platform/__tests__/app-launch-origins.provider.spec.ts`
passed 25 tests, including five provider initialization tests (missing, normalized,
unsafe and duplicate deployment origins). Total unique tests exercised: 56. The three catalog tests and API typecheck/affected lint were rerun after preserving the legacy null-tenant response. Full
repository CI, database integration suites and browser E2E were not run locally;
this change has no persistence writes or UI flow. Historical results are not used
as fresh evidence.

## UI/UX evidence

N/A: backend/contracts/configuration-only delivery; no rendered interface changes.
No claim that the future App Center, Invoice or HR clients are ready.

## Impact and remaining work

No migrations, new packages, secrets or deployment changes. New origin variables
are optional and not bound by the deployment workflow; absent configuration fails
closed. Invalid configured values fail platform initialization. Tenant app
installation state remains distinct from effective entitlement and user access.
Keep the PR Draft; human review/CI and owning runtime rollout work remain.
