# Focused Invoice client

`apps/invoice` composes the existing public `invoicesRoutes()` feature export with
`WorkspaceSessionProviders` and `FocusedAppShell`. It introduces no invoice records,
DTOs, numbering service, money rules or accounting ledger. Existing Web/Freelancer
clients retain their providers and default API façades. Production host routing,
legacy link migration and rollout remain separate work (#399, #396, #404).

## Run and build

Complete the [local HTTPS setup](../guides/LOCAL_FOCUSED_SURFACES.md), including the
developer-owned API/database prerequisites. Then run in separate terminals:

```sh
pnpm dev:focused:api
pnpm dev:invoice
```

Open `https://invoice.app.corely.test:8443/invoices?workspaceId=<authorized-id>`.
The root runner starts only login and Invoice; App Center/HR clients need not run.
The shared private configuration supplies registrations and the public App Center
destination. `pnpm build:invoice` builds login and Invoice through that same runner;
`pnpm --filter @corely/invoice build` builds only this client.

`VITE_CORELY_APP_CENTER_ORIGIN` is a required, validated public destination. Missing
or invalid configuration displays a setup error before feature requests. Never
put API, database, OAuth or proxy secrets in browser variables. Direct HTTP Vite
development on port 8096 is useful for route-mocked tests; real cookie sign-in
uses the trusted HTTPS gateway. The Vercel fallback preserves client bookmarks
but deliberately excludes reserved API/callback paths; #399 must bind those paths
before any hosted activation. No deployment is performed by this ticket.

## Routes and access

| Route                                 | Behavior                                                              |
| ------------------------------------- | --------------------------------------------------------------------- |
| `/`                                   | Redirects to `/invoices`, retaining the workspace hint.               |
| `/invoices`                           | Existing list, search/filter, empty/loading/error states.             |
| `/invoices/new`                       | Existing create form and owning create/finalize APIs.                 |
| `/invoices/:id`, `/invoices/:id/edit` | Existing detail/editor and capabilities.                              |
| `/audit?entity=invoice&id=…`          | Existing invoice-record activity projection, not global audit search. |
| Other routes                          | Invoice not-found state; no HR, Tasks or Accounting screen mounted.   |

Workspace intent remains per-tab URL state. Membership discovery, bound session
bootstrap and Invoice app access complete before screens mount. Feature links,
sidebar links, creation and Back navigation preserve the validated workspace.
Active forms register draft guards; successful saves clear the guard before
navigating. Each record route remounts the editor rather than carrying a draft to
another invoice. Old bearer tokens or global active-workspace storage do not
retarget requests. Focused list filters do not persist to the legacy global key.

`InvoiceRuntimeProvider` injects instance-scoped façades into the same screens.
`SessionFeatureHttpClient` maps their existing typed HTTP port onto SessionClient,
including same-origin cookies, CSRF, tenant/workspace headers, command identity,
cancellation and no retry/replay. Legacy consumers default to their existing
client. Query keys include user, tenant, workspace, app and resource in the focused
runtime; a fresh scoped QueryClient also prevents hydration of former contexts.
The backend retains every operation permission, app-enable/capability and record
ownership check. Showing a route or action grants no API authority.

Focused PDF downloads leave payment defaults to the owning Invoice finalize/PDF
use cases. They do not call the legacy payment-settings API, which the Invoice
BFF intentionally excludes. Legacy clients retain their existing setup flow.
PDF navigation preserves `noopener,noreferrer`; a null `window.open` result with
those flags does not establish that the browser blocked the new window.

Invoice activity reads only the authorized invoice record and its existing
timestamps/payments. Invalid entity targets make no record request, and there is
no global audit endpoint/query mounted here. This is not a complete event ledger.

The focused create header uses the selected workspace name instead of the old
Freelancer-specific placeholder address. Existing invoice number previews and
form-to-contract conversion are reused; actual numbering remains server-owned.
An unnumbered draft receives a non-authoritative editor preview so form validation
does not prevent saving it. No number preview is added to the command DTO.
Date-only values parse as local calendar dates so saving west of UTC does not
silently shift the invoice or due date backwards.

The legacy settings footer and Copilot panel remain available in their existing
clients. They are not mounted in this focused composition while #395 owns their
supporting workflows and assistant boundary. Existing inline customer selection
and creation are reused. This ticket makes no tax-format or compliance claim.

## Verification and UI evidence

```sh
pnpm --filter @corely/invoice typecheck
pnpm --filter @corely/invoice build
pnpm --dir packages/web-shared exec vitest run --config vitest.config.ts
pnpm --dir packages/web-features exec vitest run --config vitest.config.ts src/modules/invoices
pnpm --dir apps/e2e exec playwright test --config playwright.invoice.config.ts
```

The standalone Playwright configuration starts the actual Invoice Vite client
on loopback port 5188 with synthetic session/API responses. It covers list,
bookmark/reload, detail/edit, create/finalize and update command bodies, invoice
activity, loading/error recovery, empty/missing/denied states, unrelated routes,
stale token/storage isolation and dirty navigation. General/API configurations
exclude this fixture-specific suite; run it explicitly.

The PDF regression supplies contract-validated action capabilities and a draft
without a payment method. It verifies finalize/PDF requests without forbidden
settings calls, secure popup navigation and absence of a false popup error.

Separately, the existing `focused-api-access.int.test.ts` and
`sso-session-transport.int.test.ts` suites were run against a newly created,
loopback-only disposable PostgreSQL database. They execute real HTTP adapters,
authorization/session use cases and persisted records where those suites provide
them; some transport/business collaborators remain test doubles. This verifies
API permission/workspace boundaries, not a full browser-to-database create flow.
See [SSO test setup](../backend/sso.md#reproduce-isolated-checks) for the isolated
`corely_384_*` database guard. No shared database or real email was used.

The list/detail/create comparison uses the same exported components, API paths
and form-to-contract conversion as the retained clients. Existing Invoice Copilot
component tests were rerun. A separately running full legacy client was not
visually compared in this session; screenshots below show the focused composition.
No production readiness is inferred from source reuse or mocks.

Rendered states were visually inspected in English at 1280×720 and 390×844.
Phone inspection exposed a shared fieldset/metadata overflow; it was corrected
with a zero minimum fieldset width, stacked phone fields and responsive padding.
The browser suite also asserts no horizontal overflow in the phone editor.
EN/DE/VI feature translations are reused; this is not a complete localization
audit. New surface-specific setup/not-found copy is currently English; #402 owns
the broader focused-client localization/accessibility verification.

![Existing invoice list in the focused shell](images/focused-invoice/invoice-list-desktop.png)

![Reused invoice detail/editor](images/focused-invoice/invoice-detail-desktop.png)

![PDF action after owner-side finalization, without a false popup error](images/focused-invoice/invoice-pdf-owner-desktop.png)

| Phone editor                                                        | Invoice-record activity                                                       |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| ![Phone edit route](images/focused-invoice/invoice-edit-mobile.png) | ![Phone invoice activity](images/focused-invoice/invoice-activity-mobile.png) |

| Loading                                                             | Request failure                                                      |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| ![Loading list](images/focused-invoice/invoice-loading-desktop.png) | ![Retryable error](images/focused-invoice/invoice-error-desktop.png) |

![Inaccessible workspace recovery](images/focused-invoice/invoice-denied-desktop.png)
