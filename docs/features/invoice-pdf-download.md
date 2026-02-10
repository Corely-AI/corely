# Invoice PDF Download Wait Flow

## Summary

Invoice PDF rendering stays asynchronous and worker-driven:

1. API enqueues `invoice.pdf.render.requested`.
2. Worker consumes outbox event and renders via Playwright.
3. PDF is stored, document/file rows are marked ready.
4. API `GET /invoices/:invoiceId/pdf` can wait for readiness and return the URL when available.

The API does not render PDFs directly.

## Readiness State

Readiness is stored in Documents domain tables:

- `platform.Document`
  - `type = INVOICE_PDF`
  - `status = PENDING | READY | FAILED`
  - `errorMessage` for failed renders
  - `updatedAt` for progress timestamps
- `platform.File`
  - `kind = GENERATED`
  - `objectKey` points to stored PDF object
  - object key is deterministic per tenant+invoice, so duplicate requests reuse the same storage object path

## API Behavior

### `POST /invoices/:invoiceId/pdf`

- Fire-and-forget request path.
- Idempotent enqueue behavior:
  - if PDF already `READY`, returns ready payload.
  - if already `PENDING`, returns pending without duplicate enqueue.

### `GET /invoices/:invoiceId/pdf?waitMs=...`

- Wait-aware read path used by frontend download UX.
- `waitMs`:
  - default: `15000`
  - max: `30000` (values above cap are clamped)
- Flow:
  1. Ensure render request exists (idempotent).
  2. Poll readiness with capped backoff/jitter.
  3. Stop on `READY`, `FAILED`, timeout, or client disconnect.

Response contract:

- `200 OK`
  - `{ status: "READY", documentId, fileId, downloadUrl, expiresAt }`
- `202 Accepted`
  - `{ status: "PENDING", documentId, fileId, retryAfterMs }`
  - `Retry-After` header is set (seconds)
- `422 Unprocessable Entity`
  - `{ error: "INVOICE_PDF_RENDER_FAILED", message }`

## Frontend UX Pattern

Invoice Detail page uses a bounded wait loop:

1. User clicks **Download PDF**.
2. Show loading state.
3. Call `GET /invoices/:id/pdf?waitMs=15000`.
4. If `202`, wait `retryAfterMs` and retry.
5. If `200 READY`, open/download URL automatically.
6. Stop after overall budget (90s) and show fallback toast.

Safety rules:

- only one active download loop per page
- duplicate clicks are ignored while in progress
- `AbortController` cancels in-flight waits on unmount/navigation

## Operational Notes

- Multi-worker deployments are supported because readiness is read from durable DB/file state.
- Repeated wait calls are safe and idempotent.
- Keep reverse proxy / LB timeout above max wait budget plus margin:
  - recommended: >= 35s if allowing `waitMs=30000`.
- If infrastructure enforces lower timeout, lower `waitMs` on client calls.
