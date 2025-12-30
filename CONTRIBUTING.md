# Contributing to Corely

Thanks for helping build Corely. This guide keeps contributions consistent and easy to review.

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
pnpm dev:mock     # mock server (UI-first)
pnpm dev:api      # API
pnpm dev:worker   # worker
```

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
