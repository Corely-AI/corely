# Testing

Unit tests focus on the **application/use-cases** only. Controllers, Prisma adapters, and Nest wiring are not exercised. Each bounded context owns a small testkit with in-memory fakes for repositories plus lightweight mocks for cross-cutting ports (audit, outbox, idempotency, clock, id generator).

## Writing a new use-case test

1. Instantiate the use-case directly with fakes/mocks from the context `testkit` and shared utilities (fake clock/id generator).
2. Build valid inputs with the context `builders/*` helpers.
3. Assert both state (data persisted inside fakes) and side effects (audit/outbox/idempotency calls).

## Fakes vs. mocks

- **Fakes**: in-memory repositories and utilities used to assert final state (e.g., count of expenses, invoice status changes).
- **Mocks**: record invocations for audit/outbox/idempotency to assert interactions without touching external services.

Run all tests with `pnpm test` from the repo root. Use `pnpm test:watch` during development.
