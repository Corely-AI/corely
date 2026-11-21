# 441 Versioned Invoices extensions

[Issue #441](https://github.com/Corely-AI/corely/issues/441) is part of the
[app rollout](https://github.com/Corely-AI/corely/issues/440). The branch
441-version-invoice-extensions targets development after [Booking #439](https://github.com/Corely-AI/corely/pull/439).

The Invoice aggregate delegates draft eligibility checks to the Invoices package.
The application can apply a customer policy after loading the draft and before
numbering, tax and persistence. The existing invoice table uses a workspace-scoped
tenant column. The policy registration uses the authenticated request tenant and
workspace IDs. The UI slot is shared by the Backoffice and focused Invoice shell.

## Verification

- Invoice backend and UI package checks, local web typecheck, and application build.
- Five Invoice finalization tests, including repeated rejection before numbering or
  save and successful finalization after supplying a due date.
- Four Backoffice browser cases at 390 px and 1280 px on both test releases.
  Both used the same disposable PostgreSQL records and customer extension.
  The API declined the Acme draft, retained the previously issued invoice,
  and preserved its customer association.
- The candidate preview recorded backend 1.1.0 and UI 1.0.1 and passed backend
  and browser checks. The UI 2.0.0 fixture was rejected as outside the supported
  range for the Acme package.

## Browser evidence

English draft details in the Backoffice. The configured customer sees guidance
beneath the draft actions. Synthetic customer and account data appear in the captures.

| Viewport | Default                                                                  | Acme                                                               |
| -------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 1280 px  | [Default desktop](../platform/evidence/invoice-upgrade-default-1280.jpg) | [Acme desktop](../platform/evidence/invoice-upgrade-acme-1280.jpg) |
| 390 px   | [Default mobile](../platform/evidence/invoice-upgrade-default-390.jpg)   | [Acme mobile](../platform/evidence/invoice-upgrade-acme-390.jpg)   |

See the [operator guide](../platform/invoice-self-host-upgrades.md) for the
fixture, compatibility preview and recovery instructions.
