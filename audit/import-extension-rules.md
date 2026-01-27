# Import/Architecture Rules Checklist

Source docs: `docs/architecture/overall-structure.md`, `docs/architecture/architect.md`, `apps/web/docs/folder-structure.md`.

## Monorepo boundaries

- Apps live in `apps/*` (web, pos, e2e); services in `services/*`; shared packages in `packages/*`.
- Shared schemas/types live in `packages/contracts` and must be reused across FE/BE (no duplication).

## Backend architecture constraints (services/api, services/worker)

- Hexagonal per module: `domain` (pure), `application` (ports/use cases), `infrastructure` (adapters), `adapters` (HTTP/tools).
- Domain logic stays in shared packages or module `domain/` folders (no framework dependencies).
- Only repositories talk to Prisma; app/services depend on ports, not implementations.
- Modules communicate via contracts/events/outbox, not direct table writes.

## Frontend import rules (apps/web)

- `app/*` can import from `modules/*` and `shared/*` only.
- `modules/*` can import from `shared/*`.
- `shared/*` must not import from `modules/*`.
- Avoid deep module-to-module imports; use `modules/<name>/index.ts` for public exports.

## Package/API surface rules

- Web/POS consume `@corely/contracts` and clients; never import backend internals.
- Do not introduce new deep import coupling; prefer package entrypoints.
