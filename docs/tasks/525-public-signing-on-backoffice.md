# #525 — Public signing on Backoffice

## Tracking and outcome

- [Issue #525](https://github.com/Corely-AI/corely/issues/525)
- Branch `525-public-signing-on-backoffice`, based on `development`.
- Recipients can open `/sign/receive` without starting Backoffice or signing in. Sender routes keep their existing authorization.
- The separate Public Web client can continue using its existing recipient route. The Backoffice deployment serves the production recipient journey by itself.

## Implementation

Both entry points use the existing recipient form, PDF preview, localization, and invitation protocol. Backoffice serves its own HTML entry and uses the existing Vercel middleware to proxy recipient actions on the canonical host. The proxy keeps the signer cookie, exact origin, and request size checks. The signing page uses local theme tokens and a same-origin PDF worker under its content security policy.

## Verification

| Check                                                  | Result                                                                                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backoffice recipient Playwright suite                  | Five cases cover signed-out review, localization, PDF page navigation, consent, acceptance, and the private sender route with synthetic API responses.             |
| Public Web recipient Playwright suite                  | Four cases also pass through the existing recipient entry.                                                                                                         |
| Backoffice middleware unit tests                       | Seven cases cover signing and SSO, including signer-only cookie forwarding and rejection of invalid signing requests.                                              |
| Backoffice and Public Web typecheck                    | Passed.                                                                                                                                                            |
| Production Vite build and local smoke                  | The recipient HTML and PDF worker loaded with the signing security headers.                                                                                        |
| PostgreSQL signing integration with Backoffice browser | Four cases passed against a disposable database, including real invitation exchange, signer session, acceptance, and final PDF sealing with a fixture certificate. |
| Backoffice template and invitation suite               | Five cases passed on rerun. A first run observed a cancellation-focus timeout in the existing sender dialog test.                                                  |

## UI/UX evidence

The screenshots show the English confirmation step of a synthetic agreement for an anonymous browser user. The recipient has already opened the PDF, entered a typed signature, and accepted the consent statement.

- [Desktop at 1440 × 900](./525-assets/recipient-desktop.png)
- [Mobile at 390 × 844](./525-assets/recipient-mobile.png)

## Production configuration

The [Corely Sign deployment guide](../devops/corely-sign.md) records the exact public origin, Secret Manager binding, and certificate settings. This change requires a Backoffice release and an API configuration rollout. It changes no database schema.
