# 460 Versioned Issues extensions

The existing tenant-owned Issues app keeps its registry ID and Backoffice
report form. The server package contains the existing pure status-transition
rules and optional reporting policy. The policy runs after replay detection and
before creating the issue, attachments, events, or audit records. The policy
receives only priority and whether the request contains a description.

Register policies in `issue-report-extensions.ts` and matching UI guidance
in `issue-report-guidance.ts`. The example asks an operator to describe an
urgent issue. The web host selects the guidance from the authenticated tenant.
The upload controls keep their existing application behavior.

The [release manifests](../testing/fixtures/issues-upgrade/) record package and
extension compatibility. Use the preview from [#446](https://github.com/Corely-AI/corely/pull/446).
Keep the prior API and web builds as a pair for rollback. No migration is needed.
