# Corely Sign production configuration

Backoffice serves the public recipient entry at `https://app.corely.one/sign/receive`. This entry loads without a Corely account. A valid invitation is required to exchange for a signer session. The `/sign/requests` and `/sign/templates` routes continue to require a Backoffice session and their existing permissions.

## Deployment bindings

| Deployment              | Binding                                                                           | Value                                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Corely API on Cloud Run | `SIGN_PUBLIC_ORIGIN`                                                              | `https://app.corely.one`                                                                                                       |
| Corely API on Cloud Run | `SIGN_DELIVERY_KEY`                                                               | Reference an enabled 32-byte hex key from Secret Manager. Preserve existing keys or use the configured key ring when rotating. |
| Corely API on Cloud Run | `SIGN_CERT_FILE`, `SIGN_KEY_FILE`, `SIGN_TRUST_FILE`, `SIGN_TRUSTED_FINGERPRINTS` | Mount the approved sealing certificate, private key and trust chain. Configure the allowed SHA-256 certificate fingerprint.    |

On `https://app.corely.one`, the Backoffice middleware forwards the six recipient operations to `https://api.corely.one`. It forwards only the signer session cookie and copies it back from an exchange response. The recipient page and API responses use `no-store` and `no-referrer`.

Use the [Backoffice production runbook](../../.agents/skills/release/references/app-corely-one-cli.md) for the release. Verify the public page and signing proxy on the expected host before routing live invitation links there. Check the configured origin, signing key and certificate in Signing settings before sending live requests.

## Validation

- Open `/sign/receive` in a signed-out session and verify the recipient page loads without a sign-in redirect. Opening a document without an invitation or signer session should show the unavailable message.
- Open `/sign/requests` in the same session and verify it requires Backoffice sign-in.
- Use a disposable signing workspace and a synthetic invitation to verify PDF preview, acceptance, and the final sealed PDF. Verify EN, DE and VI copy and a phone viewport.
