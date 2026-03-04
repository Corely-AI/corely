# Tax Annual Filing (Assistant-Orchestrated)

This document describes the assistant-driven annual income-tax draft flow for DE personal workspaces.

## Endpoints

All endpoints are under `services/api` tax module:

- `POST /tax/income-tax/drafts` with `{ year }`
- `GET /tax/income-tax/drafts/:id`
- `POST /tax/income-tax/drafts/:id/eur/generate`
- `POST /tax/income-tax/drafts/:id/recompute`
- `GET /tax/income-tax/drafts/:id/checklist`
- `POST /tax/income-tax/drafts/:id/interview/answer`
- `POST /tax/income-tax/drafts/:id/export/pdf`
- `GET /tax/income-tax/drafts/:id/export/pdf/:exportId`
- `POST /tax/income-tax/drafts/:id/submission/confirm`

Every write endpoint returns:

- `draft`
- `draftSummary`
- `nextRequiredActions`

## Strategy Support Matrix

- `DE + PERSONAL`: supported
- `DE + COMPANY`: not supported yet (`Tax:IncomeTaxDraftNotSupportedForStrategy`)
- `Non-DE`: not supported (`Tax:JurisdictionUnsupported`)

## Data Source Port Contract

EÜR totals are sourced through tax application port:

- `TaxEurSourcePort#getEurTotals({ workspaceId, year, basis: "cash" })`

Tax module uses this port and does not query non-tax module tables directly.

## Assistant Integration

Assistant tools are registered in `ai-copilot` with `appId="tax"` and mapped 1:1 to tax draft use-cases.
Session context is stored in chat metadata under `taxAnnual`:

- `workspaceId`
- `taxYear`
- `draftId`
- `jurisdiction`
- `strategy`

## Known Gaps

- COMPANY strategy is intentionally blocked for now.
- EÜR line mapping is internal and not yet tied to official annual line-code catalogs by tax year.
- PDF export uses existing tax report PDF polling pipeline; output template maturity depends on worker/report templates.
