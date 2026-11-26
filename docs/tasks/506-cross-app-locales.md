# Add seven locales across Corely apps

[Issue #506](https://github.com/Corely-AI/corely/issues/506) · `506-cross-app-locales` into `development`

## Scope

Turkish, Polish, Russian, European Portuguese, Italian, French, and Spanish share a single locale registry. The work connects existing Web, focused app, OpenBuk, Portal, and POS catalogs and adds catalog-backed copy to public booking, signing, the restaurant directory, the landing shell, and Website Runtime controls. See the [localization guide](../frontend/localization.md) for ownership and remaining gaps.

## Verification

- `pnpm locales:check` checks 133 catalogs, including locale-specific plural forms and interpolation tokens.
- The shared language-control spec covers existing German switching, Portuguese selection, persistence, and navigation hint precedence.
- The App Center tests passed, including the repository-root build fixture.
- POS web rendered Russian sign-in. A separate POS TypeScript run reported missing `dailyZReport` and `allowPossibleDuplicate` fields in the unchanged offline cash sync code.
- Website Runtime passed TypeScript. The local browser did not reach the custom runtime page because the local proxy returned HTTP 500 and the internal path returned HTTP 404.

## Browser review

Reviewed with Edge using local data. The language pickers showed ten choices, and the selected locale persisted on reload in OpenBuk, Portal, the landing page, and the directory. The language choice also updated the document language. Public signing and POS used their browser or device language.

| Flow                                     | Viewport   | Locale              | Evidence                                                                |
| ---------------------------------------- | ---------- | ------------------- | ----------------------------------------------------------------------- |
| OpenBuk landing and booking preview      | 1280 × 900 | Turkish             | [Screenshot](../frontend/images/cross-app-locales/openbuk-desktop.png)  |
| Portal sign-in                           | 1280 × 900 | French              | [Screenshot](../frontend/images/cross-app-locales/portal-desktop.png)   |
| Landing header and hero                  | 390 × 900  | European Portuguese | [Screenshot](../frontend/images/cross-app-locales/landing-mobile.png)   |
| Restaurant directory filters and loading | 390 × 900  | Polish              | [Screenshot](../frontend/images/cross-app-locales/directory-mobile.png) |
| POS web sign-in                          | 390 × 900  | Russian             | [Screenshot](../frontend/images/cross-app-locales/pos-mobile.png)       |
| Public signature recipient               | 390 × 900  | Spanish             | [Screenshot](../frontend/images/cross-app-locales/signing-mobile.png)   |

Keep delivery Draft pending native-device and authenticated workflow verification, live booking and storefront coverage, and review of machine-translated copy. Server-generated emails and remaining hard-coded copy are tracked in the issue.
