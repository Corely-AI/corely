# Add seven locales across Corely apps

[Issue #506](https://github.com/Corely-AI/corely/issues/506) · [Draft PR #507](https://github.com/Corely-AI/corely/pull/507) · `506-cross-app-locales` into `development`

## Scope

Turkish, Polish, Russian, European Portuguese, Italian, French, and Spanish share a single locale registry. The rollout covers Backoffice, focused business apps, OpenBuk operations, Portal, POS, booking and signing transactions, and invoice notifications. Landing and public marketing pages are outside the rollout. See the [localization guide](../frontend/localization.md) for ownership and remaining gaps.

## Verification

- `pnpm locales:check` checked 123 catalogs with no errors, including locale-specific plural forms and interpolation tokens.
- Web and POS TypeScript checks passed. The POS offline cash-sync payload now includes the existing contract defaults.
- App Center, shared language selection, Invoices, People, Daily Work, and invoice email unit tests passed.
- The focused Edge suite passed all 30 tests across the English, German, and Vietnamese browser profiles. It exercised Portuguese App Center navigation, French invoice selection, and Polish guest booking with mocked APIs.

## Browser review

Reviewed with Edge using synthetic data. The Portuguese App Center test verifies translated copy, the selected workspace, language persistence after reload, and a phone viewport. The Polish OpenBuk test verifies that the guest's explicitly selected language persists through slot selection, consent, and booking confirmation when the studio uses German. Public signing and POS use the browser or device language.

| Flow                         | Viewport   | Locale     | Evidence                                                                           |
| ---------------------------- | ---------- | ---------- | ---------------------------------------------------------------------------------- |
| App Center navigation        | 390 × 844  | Portuguese | [Screenshot](../frontend/images/cross-app-locales/app-center-portuguese-phone.png) |
| Invoice list selection       | 1280 × 720 | French     | [Screenshot](../frontend/images/cross-app-locales/invoice-french-selection.png)    |
| OpenBuk booking confirmation | 1280 × 720 | Polish     | [Screenshot](../frontend/images/cross-app-locales/openbuk-polish-confirmation.png) |
| Portal sign-in               | 1280 × 900 | French     | [Screenshot](../frontend/images/cross-app-locales/portal-desktop.png)              |
| POS web sign-in              | 390 × 900  | Russian    | [Screenshot](../frontend/images/cross-app-locales/pos-mobile.png)                  |
| Public signature recipient   | 390 × 900  | Spanish    | [Screenshot](../frontend/images/cross-app-locales/signing-mobile.png)              |

Keep the PR Draft while remaining inline business copy, translation review, and backend-dependent or native-device verification are pending. The remaining large screens cover resource editing, CMS, coaching, form details, shipments, rentals, sales, signature templates, and tax. The focused browser suite uses API fixtures. The CI, Frontend Consumers, and Multi-origin Regressions workflows also failed on the baseline `development` commit.
