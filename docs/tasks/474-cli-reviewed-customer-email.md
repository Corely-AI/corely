# 474 Review a customer email and follow delivery from the CLI

- Issue [#474](https://github.com/Corely-AI/corely/issues/474), epic [#468](https://github.com/Corely-AI/corely/issues/468).
- Branch `474-cli-reviewed-customer-email` targets `472-cli-reviewed-appointment-changes` ([#484](https://github.com/Corely-AI/corely/pull/484), `284b1ca0`). The shared email worker and review are provided by [#482](https://github.com/Corely-AI/corely/pull/482) and [#483](https://github.com/Corely-AI/corely/pull/483).
- Adds `appointments message draft`, `status`, `queue` and `retry`, with separate grants and generic aliases. The approved email remains tied to a committed booking version, exact recipient and exact content.

## Verification

- Contracts build, CLI build and typecheck, API build and typecheck passed. The full API started locally against a disposable database and registered the browser and CLI routes.
- Forty-four tests passed across Identity, Approvals, Booking, Notifications, and People.
- Grant HTTP tests cover independent draft, queue, status and retry access and cross-workspace denial. Approval and Notifications integration tests use PostgreSQL and an isolated email sink for separate review, repeated queue requests, provider failure and recovery under the same ID. The committed booking result remains available during delivery failure.
- [Windows CLI output](474-assets/customer-email-cli.png) captures failed and accepted synthetic results over local HTTPS using the built CLI and OS credential store. Checked that pending review leaves the email unqueued, and that recovery preserves the delivery ID.
- [German mobile email review](330-assets/customer-email-review-mobile.png) uses the same review-path contract and shows the exact message in Backoffice.
