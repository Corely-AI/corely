---
name: prepare-pull-request
description: Prepare a Corely ticket-specific draft PR with concise outcome, reproducible checks and UI/UX review evidence where applicable. Use for PR creation, updates or reviewer handoff.
---

# Prepare a ticket PR

Read [AGENTS](../../../AGENTS.md), [contribution/DCO rules](../../../CONTRIBUTING.md), the actual
issue, full diff, validation evidence and [PR template](../../../.github/pull_request_template.md).

1. Verify the ticket's branch, actual head and intended base, parent/dependencies and existing PR.
   Discover the remote/default branch; do not hard-code `main`. For dependent work, confirm the
   selected base contains the needed contracts and the diff excludes unrelated prerequisite work.
   Recheck the diff and checks after retargeting or implementation changes.
2. Each implemented ticket gets its own PR and issue reference. Reuse its existing PR rather than
   opening duplicates. A tracking epic does not require a second empty PR; an integration PR needs
   an explicit integration outcome. Use a closing keyword only when that PR actually completes
   the issue on the intended integration path; otherwise use `Related to`.
3. Finish scoped self-review and applicable checks. Use current package scripts, not imported
   commands such as a nonexistent validation wrapper. Summarize real commands/results/skips and
   material baseline failures. For environment/dependency changes inspect actual typed config,
   examples, bindings, license constraints and affected consumers; do not invent an inventory,
   reviewer, exemption or new approval system.
4. For interface changes follow [ui-change](../ui-change/SKILL.md). Include screenshots/recording,
   affected routes, relevant responsive/device/locale states and interaction checks, with evidence
   accessible to the reviewer. Backend-only or prose-only work uses a brief UI/UX N/A explanation.
5. Commit with `git commit -s` when delivering the requested ticket, honoring explicit local-only or
   no-commit limits. Push only its branch and create a Draft PR using the verified base. Use a
   structured body argument or a temporary file with `gh pr create --body-file`; do not interpolate
   Markdown into shell code. A request just to draft text does not authorize publication.
6. Write for a reviewer who did not read the chat: issue/outcome, scope/base/dependencies, concise
   change, reproducible verification, UI/UX evidence and material risks. Follow the repository
   template. Do not dump investigation logs, raw payloads or unsupported readiness claims.
7. Read back the PR URL, head/base, body, checks and draft state. Keep Draft while implementation,
   required checks or UI/UX evidence has material gaps. Use known reviewers and actual branch
   protection when review is requested; do not copy another organization's reviewer accounts.
   Update tracking with verified progress. PR creation or a green check is not ticket acceptance,
   merge permission or deployment authorization.

Return PR link, test outcome, UI/UX evidence/N/A, current review state and remaining limits.
