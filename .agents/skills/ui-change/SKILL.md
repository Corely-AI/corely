---
name: ui-change
description: Implement and visually verify Corely screens, copy and interactions with UI/UX evidence for review. Use for user-visible changes, not backend-only or prose-only work.
---

# Change and review UI/UX

Read [AGENTS](../../../AGENTS.md), the ticket/design and the affected surface's instructions.
Use [CRUD and operational patterns](../../../docs/frontend/crud-ui-standard.md),
[shared UI](../../../docs/frontend/shared-ui.md), and existing neighboring screens.
Follow [implement-ticket](../implement-ticket/SKILL.md) for ticket delivery.

1. Identify the actual surface: `apps/web`, focused Vite client, public Next.js journey, website
   runtime or Expo POS. A product app does not imply a new deployment. Inspect its routes, shared
   exports, tokens, forms, localization, auth/workspace context and relevant tests.
2. Use `@corely/ui`, `@corely/web-shared` and `@corely/web-features` public exports; never import
   another app's private screens. Keep list/detail conventions for CRUD, with calendars, boards,
   daily views or decision inboxes where the task warrants them. Preserve public booking and the
   existing OpenBuk English/German/Vietnamese behavior.
3. Verify the actual rendered flow, not just source or a build. Exercise relevant loading, empty,
   error, success, denied access, stale action and disabled-AI states. Inspect phone/desktop sizes
   for web, or the affected native device/layout for POS; test keyboard, focus, labels, dialogs,
   touch targets, overflow, dates/timezones and locale where applicable. Record what was checked.
4. Capture useful screenshots or a short recording, with before/after views when they clarify the
   change. Use synthetic data. Remove tokens, access-bearing links, private personnel reasons and
   customer data from screenshots, traces and logs. Keep large generated artifacts out of source
   unless requested; provide accessible attachments/links or an existing evidence location.
5. In the ticket's PR include the affected route/flow, artifact links, viewports/devices/locales,
   manual interaction results and automated checks. Describe UX choices needed to judge the
   outcome; avoid per-file narration. Use [the PR template](../../../.github/pull_request_template.md).
   Material missing visual or interaction evidence keeps the PR Draft, with the exact limitation.

UI visibility is not backend authorization. AI remains optional and sensitive actions retain
owning-use-case validation and authorized confirmation. A screenshot does not prove interactions
or security, and an E2E pass does not replace visual inspection.

Return the changed user experience, actual UI/UX checks, evidence and draft/readiness state.
