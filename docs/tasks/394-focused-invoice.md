# 394 — Focused Invoice composition

- Issue: [SURF-13 #394](https://github.com/Corely-AI/corely/issues/394), parent #380.
- Branch: `394-focused-invoice`; base `origin/development` at
  `e71783f190cf068471fdc3e7b12a6dcd63c02cc8`.
- Prerequisites #386/#389/#390/#391 completed. #393 was skipped because #392 is
  still open; this ticket does not depend on App Center client delivery.
- Initial PR: [#418](https://github.com/Corely-AI/corely/pull/418), merged into
  `development`. Issue #394 is closed; the review follow-up below does not reopen it.

## Outcome and reuse

Thin Vite client with existing invoice routes/screens, scoped session/shell, typed
per-instance HTTP façade adapters and feature runtime context. No copied screens,
DTO fork, invoice engine/ledger, migration, AI execution, deployment or new owner.
Legacy clients retain default transports/providers. Focused feature query keys,
URLs and draft guards use verified account/tenant/workspace scope.

Invoice activity is a constrained projection from authorized invoice records,
never global audit retrieval. Unrelated routes and entity types do not render
other apps. Settings/payment configuration and assistant composition remain #395;
legacy settings/Copilot panels are not mounted in the new client yet.

Strict Invoice compilation exposed existing optional capability indexing and
missing schema-default booleans in reachable shared controls. Types/defaults were
made explicit without changing their intended false defaults. Shared form
projection/customer-option helpers keep the detail screen within the 500-line
commit limit. An unnumbered draft gets only an editor preview, not a new numbering
command. Phone clipping and a missing customer-header translation key were fixed
in the reused components.

## Actual verification

- Invoice strict typecheck and Vite build passed; fixture bundle-size warning.
- Web-shared typecheck passed. Shared unit/component suite: 94 passed.
- Existing invoice component/projection tests: 4 passed, including unnumbered-draft
  validation and date-only round trips west of UTC.
- Standalone Invoice Playwright suite: 6 passed. Browser-only route-mocked API;
  list/create/update/deep link/reload/activity, denied/empty/error/loading states,
  dirty navigation, old token/storage isolation and mobile geometry.
- Shared API/session integration suites: 28 passed against test-owned container
  `corely-394-invoice-verification`, a loopback random port and database
  `corely_384_invoice394`. Schema SQL was generated from the current model and
  applied only inside that disposable database. Test fixture collaborators remain
  where the existing suites define them. Container stopped/removed after the run.
- Frozen-lockfile offline install passed; lockfile adds only the Invoice importer.
- Scoped lint/format/whitespace checks passed (inherited debug-log warnings and
  standard spec/config ignores). The documented `dev:invoice` command started
  actual login/Invoice origins; HTTPS public entry/deep-route checks returned 200.
- Full web-features package typecheck has unrelated existing assistant/cash/People
  test errors; the strict reachable Invoice graph passes. Full repository checks
  are not claimed. A fresh `arch:check` failed in the unchanged Windows script
  resolving `D:\D:\Working\Kerniflow\apps\web\src`. The unrelated global cash DB
  hook limitation remains separate from scoped checks.

## Evidence and limits

[Composition, setup and screenshots](../frontend/focused-invoice-client.md).
Rendered English list/detail, phone editor/activity, loading/error and denial
states inspected. Automated browser interactions validate save/discard/retry and
route restoration. No separate full legacy-client visual run or complete live
browser-to-database flow was executed; source components/contracts are shared and
API tests were separate. No locale/a11y completeness or production claim.

Publication uses the documented `HUSKY=0`
pre-push bypass due to the previously observed unrelated global cash integration
failure; staged-file checks still run. No merge, deployment or shared-data changes.

## Review follow-up

Branch `394-invoice-review-fixes` starts at `origin/development`
`05fceeeb341bd8945765b447325b8c06120369ad`, after #418 merged.

- P1 focused-client regression: downloading a draft PDF could invoke legacy
  payment-settings discovery, receive the expected BFF 403 and close the focused
  feature boundary before finalize/PDF. Focused downloads now delegate defaults
  to the existing owning Invoice use cases. No BFF permissions were expanded.
- P2 adjacent existing defect: the reused helper treated a null `window.open`
  return as popup failure even when `noopener,noreferrer` opened the destination
  successfully. Removed that false error while preserving the security flags.
- The browser fixture previously omitted action capabilities, hiding the PDF
  button from coverage. It now exercises this action with validated capabilities
  and explicit settings denial. Both defects reproduced with failing assertions
  before their corrections. The storage isolation test now seeds the actual
  legacy active-workspace key.

Fresh follow-up checks: seven route-mocked browser tests and four invoice
component/projection tests passed; strict Invoice typecheck and production build
passed. Scoped lint passed with the two existing debug-console warnings;
format/whitespace checks passed. The build retains its bundle-size warning.
The original 94 shared tests and 28 isolated API/database tests above were not
rerun for this follow-up. Full-repository and live browser-to-database checks are
not claimed.

The new desktop PDF screenshot in the composition guide was visually inspected
at 1280×720 in English. Browser assertions verify the destination opens with no
opener and no false error; the destination is synthetic, not a rendered real PDF.
Existing mobile evidence remains from the initial delivery. Follow-up stays Draft
for review/required CI; no merge or deployment is authorized by this review.
