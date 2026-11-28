# #488 Requests in App Center

## Tracking and outcome

[Issue #488](https://github.com/Corely-AI/corely/issues/488).
Branch `488-requests-app`, based on `origin/development` at `9e1401fd`.
[#392](https://github.com/Corely-AI/corely/issues/392) supplies the App Center.
[#284](https://github.com/Corely-AI/corely/issues/284),
[#349](https://github.com/Corely-AI/corely/issues/349) and
[#350](https://github.com/Corely-AI/corely/issues/350) track adjacent work.

## Scope and decisions

- Expose the existing Issues app as **Requests** through the platform directory.
  Preserve its registry ID and legacy issue links.
- Pilot signed-in intake with problem and service choices. Constrain new records
  to the selected workspace and show safe status to the submitter.
- Track the confirmed client email independently of the submitting account.
  Record and send a completion summary through the existing outbox and Resend.
  Keep the original recipient, summary and provider idempotency key on retry.
  Require provider review if the retry window has expired.
- Public intake links and linked follow-up tasks remain adjacent work. The
  authenticated pilot does not require a published form.

## Verification

- Prisma Client generation and migration deployment passed against a disposable
  local PostgreSQL database. The integration test ran with polling selected and
  compared concurrent intake and send requests, event counts, workspace and
  requester scopes, and the persisted delivery state.
- The Issues and launch-projection Vitest checks passed.
- The route-mocked Chrome test exercised App Center discovery, mobile intake,
  assignment, status, internal notes, resolution, recipient confirmation,
  simulated send failure and retry, and denied access. Screenshots use synthetic
  data. See [desktop App Center](488-assets/requests-app-center.png),
  [mobile intake](488-assets/request-intake-mobile.png), and
  [desktop send recovery](488-assets/request-update-failed.png).
- Repository architecture validation reports existing Prisma boundary violations.
  Live email delivery and a deployment were not exercised.
