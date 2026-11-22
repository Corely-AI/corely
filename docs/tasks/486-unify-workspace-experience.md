# 486 Unify workspace experience

## Tracking and outcome

Issue https://github.com/Corely-AI/corely/issues/486.
Branch `486-unify-workspace-experience`, base `origin/development` at bf323156.
One product experience for both legal entity kinds, optional apps via existing
app management, and existing tax classification retained.

## Verification

- API targeted Vitest run passed 10 tests across configuration, focused launches,
  expense creation and workspace resolution. Resolver coverage subsequently
  extended to both legal kinds and rerun.
- Web navigation and sidebar Vitest run passed 5 tests.
- Landing typecheck passed.
- Web and API typechecks report unresolved workspace extension packages.
  API also reports missing AWS SDK storage dependencies and @vercel/queue.
- Database integration tests were not run.
- Backoffice browser validation remains pending. Draft PR is required until
  screenshots and interaction verification cover onboarding and settings.

## Decisions

Shared baseline omits optional CRM/sales/import/rental/issues apps for new tenants.
Existing installs retain their state. All workspaces expose role controls and
expense approval transitions. Existing records retain legal type and expense
status. The upgrade API remains for compatibility.

## Additional checks and UI evidence

- Follow-up API run passed 16 tests including both legal kinds and menu filtering
  (25 unique backend tests across both runs), plus 5 web tests.
- Landing lint passed with two existing-file warnings. Architecture check reports
  Prisma boundary violations across existing modules, including expenses.
- Landing inspected at 1440x1000 and 390x844. Captures in ignored
  `tmp/486/landing-desktop.png` and `tmp/486/landing-mobile.png`.
  The shared-app section renders and the mode toggle is absent. The mobile page
  still has horizontal overflow. Full backoffice browser checks remain pending.
