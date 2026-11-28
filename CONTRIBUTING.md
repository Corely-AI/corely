# Contributing to Corely

Thanks for helping build Corely. This guide keeps contributions consistent and easy to review.

Follow the [Corely Engineering Guide](docs/engineering-guide.md) for ticket delivery,
verification and review. Each implemented ticket has its own Draft PR; interface
changes include screenshots/recording and manual UI/UX evidence before review.
Use the [PR template](.github/pull_request_template.md) and relevant
[agent skills](docs/ai/skills-management.md).

## Before you start

- For larger changes, open an issue first to align on scope and architecture.
- Small fixes and docs improvements are always welcome.

## Development setup

```bash
pnpm install
cp .env.example .env
```

Common dev commands:

```bash
pnpm dev          # build packages + run all workspaces
pnpm dev:web      # web app
pnpm dev:api      # API
pnpm dev:openbuk  # focused booking frontend
```

Background execution is hosted in `services/api/src/modules/background`, not a separate worker. The historical mock-server runtime is absent in this commit.

Read [agent guidance](AGENTS.md) and [product strategy](docs/products/corely/README.md) before choosing scope; reuse existing owners rather than scaffolding the catalog.

Quality checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Architectural boundaries

- Follow DDD module boundaries and ports/adapters.
- No cross-module direct DB writes.
- OSS code must not import anything under `ee/`.

## Documentation

- Update relevant docs in `docs/` when behavior changes.
- Keep module docs in sync with contracts and mock-server routes.

## Repository hygiene

- Keep root files for project entry points, required configuration and build tooling.
- Put maintained documentation under `docs/`; dated plans/status reports belong in
  [the archive](docs/archive/README.md), with current guidance linked separately.
- Put reusable development utilities in `scripts/`; keep one-off scratch work outside
  the repository or in ignored `tmp/`.
- Keep screenshots intended as documentation beside the owning document. Generated
  test reports/captures go in ignored output folders; do not commit diagnostics,
  credentials, `.NET` `bin`/`obj`, dependency trees or build caches.
- Preserve local environment/configuration files and installed dependencies during
  routine cleanup. Do not move source modules or deployment configuration merely
  to make the root look smaller.

## DCO sign-off (required)

We use the Developer Certificate of Origin (DCO). Sign your commits:

```bash
git commit -s -m "Your message"
```

By signing, you certify you have the right to submit the work under the project license.

## Pull request checklist

- Tests or validation added when appropriate.
- `pnpm lint` and `pnpm typecheck` are clean.
- Docs updated if behavior or workflows change.
