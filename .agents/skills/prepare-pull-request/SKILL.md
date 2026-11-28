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
3. Before opening a new PR, run the applicable checks using [local Docker](../../../docs/devops/DOCKER.md).
   Run the affected application and any required services and test databases locally in Docker.
   For prose-only PRs, limit validation to formatting and links. Use current package scripts and
   record actual commands, results, skips and material baseline failures. For environment or
   dependency changes, inspect typed config, examples, bindings, license constraints and consumers.

   Use checked-in Prisma migrations for every schema change. Create and test migrations against
   local Docker PostgreSQL. Never use `prisma db push`, change a database schema directly, or run
   migrations against remote Supabase during PR work. Follow [release](../release/SKILL.md) for
   remote migrations.

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
7. Read back the PR URL, head/base, body and checks. Keep it Draft until the implementation meets
   the ticket's acceptance criteria, the full diff has been reviewed, applicable local checks and
   required checks available on the draft have passed, and applicable UI/UX evidence is attached.
   Then mark it **Ready for review** (`gh pr ready <number>`) and verify that GitHub shows it as
   ready. End the implementation handoff there so CodeRabbit can review it. Maintainers merge
   after human review and required checks pass. Track only verified progress.

Return PR link, test outcome, UI/UX evidence/N/A, current review state and remaining limits.
