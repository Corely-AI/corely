# Background Module

The `background` module is the API-hosted background runtime.

It exists to run asynchronous internal work without requiring a separate deployment. The API now owns:

- outbox processing
- invoice PDF generation
- workflow queue processors
- the shared background runtime used by Cloud Tasks and Cloud Scheduler targets

## Why it exists

Previously, background execution lived in a separate service. That created extra deployment, routing, and configuration surface:

- separate Cloud Run service
- separate Docker image
- separate local dev process
- extra internal HTTP hops between runtime surfaces

The new module collapses that into the API service while keeping the execution paths internal-only.

## High-level structure

Entry files:

- `services/api/src/modules/background/background.module.ts`
- `services/api/src/modules/background/background-internal.controller.ts`
- `services/api/src/modules/background/background-internal.guard.ts`

Runtime code:

- `services/api/src/modules/background/runtime/...`

`BackgroundModule` is infrastructure, not a product/domain module. It composes reusable background handlers and internal controllers, but it does not define user-facing business APIs.

## What it imports

`BackgroundModule` currently imports these runtime modules:

- `storage`
- `outbox`
- `workflows`
- `invoices`

Those provide the concrete handlers and dependencies used by internal background endpoints.

## Internal endpoints

The module currently exposes:

- `POST /internal/background/outbox/run`
- `POST /internal/invoices/:invoiceId/pdf`

Additional workflow queue endpoints are provided by the imported `workflows` runtime module:

- `POST /internal/queues/workflow-orchestrator`
- `POST /internal/queues/workflow-task-runner`

## Auth model

All background endpoints are guarded by `BackgroundInternalGuard`.

Preferred auth:

- `x-service-token` matching `WORKER_API_SERVICE_TOKEN`

If the service token is not configured, the guard currently falls back to a legacy internal key or allows the request in local setups.

## Trigger model

The background module is designed to be called by infrastructure, not by end users.

Typical trigger paths:

1. Domain code writes an outbox event transactionally.
2. `packages/data/src/outbox-dispatch-scheduler.ts` schedules a coalesced Cloud Task.
3. Cloud Task calls `POST /internal/background/outbox/run`.
4. `OutboxPollerService` claims due events and executes handlers.

Recurring and delayed jobs use:

- Cloud Scheduler for recurring triggers
- Cloud Tasks for durable delayed/event-driven triggers
- API internal endpoints as execution targets

## Outbox responsibilities

The outbox runtime handles asynchronous follow-up work such as:

- invoice email sending
- invoice PDF rendering requests
- issue transcription
- tax PDF / ERiC follow-up
- forms submission follow-up
- classes invoice send flow
- notification intents
- other event-driven handlers registered in the outbox module

The execution model remains:

- claim with Postgres row locking
- process outside the claim transaction
- heartbeat leases
- retry with backoff
- require idempotent handlers

## Design rules

When changing this module:

1. Keep endpoints internal-only.
2. Put execution logic in `runtime/`, not in the thin controller layer.
3. Prefer Cloud Tasks for real async delivery, not polling loops.
4. Keep handlers idempotent because delivery is at-least-once.
5. Only expose the smallest possible HTTP surface needed for schedulers/tasks.

## When to add code here

Add code to `background` when all of the following are true:

- the work is asynchronous or delayed
- it should not run inline with the user request
- it is internal platform infrastructure, not a user-facing API
- it needs durable retry, scheduling, or queue delivery

Do not add normal domain HTTP APIs here. Those still belong in their owning domain modules.

## Related files

- `packages/data/src/outbox-dispatch-scheduler.ts`
- API scheduling helpers under `services/api/src/shared/infrastructure/`
- `docs/scheduling.md`
- `docs/devops/background-runtime.md`
