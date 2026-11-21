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

## Verification

Three targeted policy and status-rule unit tests passed. API and web builds and
typechecks, package typechecks and the frozen install passed.

The same isolated PostgreSQL database and extension were used on 1.0 and 1.1.
Existing issue and Party references survived and the original request replayed.
An urgent report with a missing description was rejected in Acme. A described
report succeeded and the default tenant could submit without a description.
The candidate also allowed triage by the assigned synthetic reporter. The
compatibility preview accepted the 1.1 package pair and rejected UI 2.0.0.

Four Backoffice browser cases passed on each build. The configured desktop
case verified the validation message after submitting the report. The issue
attachment controls are present in the form, with camera and media persistence
outside this upgrade rehearsal.

| Width   | Default                                                                  | Configured                                                              |
| ------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| 1280 px | [Default desktop](../platform/evidence/issues-upgrade-standard-1280.jpg) | [Configured desktop](../platform/evidence/issues-upgrade-acme-1280.jpg) |
| 390 px  | [Default mobile](../platform/evidence/issues-upgrade-standard-390.jpg)   | [Configured mobile](../platform/evidence/issues-upgrade-acme-390.jpg)   |
