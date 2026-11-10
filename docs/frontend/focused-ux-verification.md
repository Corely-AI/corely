# Focused app UX verification

Related to [#402](https://github.com/Corely-AI/corely/issues/402). This is local,
synthetic first-wave evidence, not production acceptance or an accessibility certification.

## Corrections

App Center, Invoice and central Login opt into `@corely/ui/focused-tokens.css`:
muted text has stronger contrast and cyan accent buttons use dark foreground text.
The original palette and other clients remain unchanged. Dark mode keeps existing tokens.
Invoice uses the stored English/German/Vietnamese preference, falling back to the browser
language and then English, including `html.lang`, session messages and shell controls.
Granted navigation entries retain their routes and permissions; the owner can supply
translations for their existing label keys. Command palette labels have optional localized
values, with compatible English defaults for existing callers.

Invoice pagination uses native disabled buttons. Line controls, notes, VAT and assistant
selectors have accessible names. Date controls include both the field name and visible date.
The small-screen shell wraps its controls; customer-selection text wraps within its card.
No authorization, invoice calculation, AI execution or sending policy changes.

## Reproduce

```sh
pnpm install --frozen-lockfile
pnpm --dir apps/e2e exec playwright install chromium
pnpm --dir apps/e2e exec playwright test --config playwright.focused-ux.config.ts
pnpm --dir apps/e2e exec playwright test --config playwright.invoice.config.ts
pnpm --dir packages/web-shared exec vitest run --config vitest.config.ts src/layout
```

The new CI matrix entry runs the same focused UX suite independently. It starts three
loopback Vite origins with deterministic transport fixtures. It does not test real cookies,
DNS, deployed headers or the production API. Authentication security remains covered by
the separate SSO verification work. Traces are disabled; images contain synthetic records.

Axe scans use WCAG 2 A/AA and 2.1 A/AA tags, without excluded rules or elements. Finite
animations finish before scanning to avoid measuring transitional opacity. Checks include
App Center search, populated Invoice list/editor, command palette and expired Login.
Keyboard checks cover app-switcher activation/Escape focus restoration, palette input focus,
error retry and cancelling the dirty-form dialog without losing edits. Geometry checks at
320×740 verify the Invoice main pane and header actions remain within their containers.
Recovery checks capture empty, missing, denied, loading, error and dirty-form states in all
three selected languages. Desktop browser viewport is 1280×720.

## Evidence

Local screenshots in [images/focused-ux](./images/focused-ux/) accompany the PR. Each image
name identifies its surface/state and language. Phone images cover App Center, Invoice and
palette in en/de/vi; Login expired images use the desktop viewport. English desktop Invoice
images cover loading, empty, missing, denied, error and unsaved-change decisions.

## Limits and remaining gates

- Semantic accessibility trees, automated scans and keyboard interactions were inspected;
  a native screen-reader session (NVDA/VoiceOver), touch device and WebKit were not run.
- HR is still marked coming soon in the launch catalog. Its #397/#398 implementation is now
  integrated in the base; launch UX verification remains separate from this three-surface suite.
- Synthetic customer names and server fixture labels are not a translation coverage audit.
  Existing business workflows outside the checked primary Invoice flow retain their scope.
- No staging deployment, external app launch or production rollout was performed. Those
  checks depend on approved bindings and hosting access in #399.
- Broad repository checks have known failures outside this ticket; scoped passes do not
  establish that all existing consumers or the full CI workflow are green.
