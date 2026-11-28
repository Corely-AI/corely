# 332 pilot accessibility and locales

[Issue #332](https://github.com/Corely-AI/corely/issues/332) covers functional
accessibility and locale review for the focused pilot. This record reports the
observed routes and unresolved package integration.

## Tested source

The disposable Windows Chromium run used Chrome 158.0.8127.88 and
`@axe-core/playwright` 4.14.0. It built a detached composition with the #332
changes applied to these exact inputs.

| Input                                                         | Head                                       | Purpose                               |
| ------------------------------------------------------------- | ------------------------------------------ | ------------------------------------- |
| [#303 shell](https://github.com/Corely-AI/corely/pull/538)    | `1cfc4b13cf25fefa416fe1c71d8a17ebad839afd` | Studio navigation and workspace setup |
| [#313 Tasks](https://github.com/Corely-AI/corely/pull/544)    | `364efb03847052438512842115bb931781adf365` | List and board                        |
| [#311 Requests](https://github.com/Corely-AI/corely/pull/548) | `ac0ae792e8bfbf5b9455d423e02e19a94b91a764` | Assigned review                       |

The temporary composition before the #332 changes was
`c1a30efed17b98ead9ba7333fa66b5c2af6ce432`. Its fixture APIs use a loopback
Vite preview and synthetic records. They exercise the rendered UI without
external messages or real bookings.

## Observed behavior

- German OpenBuk Daily Work at 390 × 844 displayed the localized fetch
  error. The keyboard activated Retry and the shell skip link, selected
  Board and completed a task with its action button. The task moved to the
  completed column and still displayed its workspace time zone.
- Vietnamese Requests at 390 × 844 required a note before returning a
  request. The confirmation fit within the viewport, Tab stayed in the
  confirmation and Escape restored focus to the launching button. The
  keyboard preview made no request mutation.
- Public OpenBuk booking in English at 1280 × 900 and German and Vietnamese
  at 390 × 844 displayed the expected localized labels, civil day,
  Europe/Berlin time and EUR amount. Enter selected a slot. Tab moved to
  the customer name field. The document language matched the tested locale.

The initial run found that a canceled Requests confirmation dropped
keyboard focus and that the public booking service metadata failed the
automated contrast rule in all three locales. The branch restores the
trigger focus, adds a programmatic confirmation description with mobile
insets, and increases contrast on that metadata. The rerun includes
the corresponding keyboard checks and axe scans. Screenshots were visually
reviewed.

## Package integration still open

- [Guest management #553](https://github.com/Corely-AI/corely/pull/553)
  reported a separate real-API Chromium journey on
  `2f26f2cf715c5458ea8b178123b7fef6e2cb7c41`. It covered English mobile
  booking, invalid credentials, moving or canceling and authorized replay.
  Adding the branch to this exact composition produced conflicts in the
  studio page, the OpenBuk locale catalog, and Booking module wiring.
- [Knowledge #547](https://github.com/Corely-AI/corely/pull/547) at
  `ffa2c9457d03b09fec20b76b98cf4e84d1e31f97` has separate Tasks-to-published-
  procedure mobile keyboard and view-revocation evidence from the owner’s
  integration snapshot `49d2e009ab498e03ee68118b8554e4797781d452`.
  Composing the branch into the pilot snapshot produced overlapping
  route, document, offline and application registry changes. The combined
  package and Request-origin procedure handoff remain unverified.
- Results cover the listed Chrome viewports and fixtures. Full
  cross-app acceptance, other browsers, physical devices, and assistive
  technology sessions remain unverified.

## Reproduce

Use a local composition that contains the input branches and the #332
changes. Build Backoffice with `VITE_API_BASE_URL=http://127.0.0.1:5227/api`
and `VITE_API_MODE=real`, then run the dedicated Playwright configuration.
It starts the preview on loopback port 5227.

```sh
pnpm --filter @corely/web build
pnpm --dir apps/e2e exec playwright test --config playwright.pilot-accessibility.config.ts
```

Set `PLAYWRIGHT_CHANNEL=chrome` to use a locally installed Chrome as in this run.

## Results and evidence

All five Chromium cases passed. Scoped Web build and typecheck passed.
The final [axe results](332-assets/axe-summary.json) have zero violations
or manual-review flags in the scanned regions.

- [German Task board, 390 × 844 viewport](332-assets/de-mobile-task-board.png)
- [Vietnamese Requests confirmation, 390 × 844](332-assets/vi-mobile-review-dialog.png)
- [English public booking, 1280 × 900 viewport](332-assets/en-public-booking.png)
- [Vietnamese public booking, 390 × 844 viewport](332-assets/vi-public-booking.png)
