---
name: create-e2e-test
description: Author or extend Corely Playwright browser/system tests with deterministic isolated setup and meaningful assertions. Running existing tests or adding unit tests does not need this workflow.
---

# Create E2E coverage

Read [AGENTS](../../../AGENTS.md), the acceptance criterion, nearest same-surface tests/helpers,
[E2E guide](../../../docs/testing/E2E.md), [package scripts](../../../apps/e2e/package.json) and
actual Playwright configuration. Use [implement-ticket](../implement-ticket/SKILL.md) for delivery.

1. Select the actual journey and observable result; choose browser-only, route-mocked, API-backed
   or disposable-database coverage based on the boundary being proved. Identify what should fail
   when the behavior is absent. Do not add a broad seed/test framework for one scenario.
2. Inspect `testDir`/`testMatch`, projects, URLs, authentication, server startup/reuse, environment
   loading, cleanup and reporters. Corely has general, API, POS, Cash and OpenBuk configs; they
   are not interchangeable. Store specs under the selected configuration's existing tests area.
3. Reuse established typed fixtures, auth helpers and user-facing locators. Use synthetic run-scoped
   identities; do not assume a token, remote account or local server belongs to this test run.
   Verify effective database/URL targets before resets, seeds, outbox drains or cleanup. Mutations
   must be confined to explicitly disposable test-owned data; do not weaken target guards.
4. For OpenBuk read [its configuration](../../../apps/e2e/playwright.openbuk.config.ts),
   [isolated PostgreSQL suite](../../../services/api/src/modules/booking/__tests__/openbuk.int.test.ts)
   and [product setup](../../../docs/products/openbuk/README.md). The `OPENBUK_TEST_DATABASE_URL`
   suite requires a disposable `openbuk_test_*` database; its Playwright config expects separately
   started services. Disable real background delivery for isolated acceptance as documented.
   Preserve trusted public workspace resolution, guest idempotency and EN/DE/VI behavior.
5. Assert meaningful user/API outcomes, negative access and relevant retries/concurrency. Prefer
   web-first assertions over fixed sleeps or retries that conceal nondeterminism. Auth simulation
   cannot prove production authorization; mocks cannot prove provider delivery.
6. Use collection preflight when helpful, then actually run the selected spec/config and inspect
   executed versus skipped tests. A targeted example from the repository root is
   `pnpm --dir apps/e2e exec playwright test --config playwright.openbuk.config.ts --list`;
   omit `--list` only with verified safe services/data. List mode is not an E2E pass.
   Run affected neighboring tests when shared fixtures change and required application checks.
7. Review traces/screenshots/logs for secrets and private data. Record configuration, commands,
   counts, results, environment/cleanup and unrun cases. Interface changes also need the manual
   UI/UX checks and PR evidence in [ui-change](../ui-change/SKILL.md).

Do not reset a shared database, use `prisma db push`, send real messages or financial actions, add
`test.only`, hide failures with unjustified skips, or label historical runs as fresh evidence.
Return the ticket's PR, proven behavior, actual execution and remaining verification limits.
