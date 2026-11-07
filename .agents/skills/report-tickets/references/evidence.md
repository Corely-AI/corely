# Collect and count ticket evidence

Verify `Corely-AI/corely` and organization Project #1 live. Discover current fields/options and
pagination; issue numbers, node IDs, project item IDs and field IDs are distinct. A large limit
alone is not proof of completeness. Include custom/missing status, unassigned issues and coverage
limits; exclude PRs, drafts and redacted content from issue totals.

Keep repository issue state, Project status and delivery evidence separate. Read actual criteria,
relevant comments, direct implementation/closing relationships and current PR head/base/checks.
An incidental cross-reference or merge into an intermediate branch does not prove delivery into
the intended target. Inspect historical snapshots only as dated evidence.

Normalize records for [the offline helper](../scripts/ticket-stats.py):

```json
[
  {
    "kind": "Issue",
    "url": "https://github.com/Corely-AI/corely/issues/298",
    "state": "OPEN",
    "assignees": [],
    "projectStatus": "Backlog"
  }
]
```

This is an input-shape example, not a current status observation. Assignees are login strings,
status is its exact recorded value or null, and kinds distinguish issues from non-issue items.
Conflicting duplicates fail; identical copies count once. The helper counts open assigned tickets
and reports excluded closed/unassigned/non-issue rows. Report unassigned inventory separately;
never present its assigned subtotal as the whole board.

From the repository root, using a previously prepared scoped JSON file:

```sh
python3 .agents/skills/report-tickets/scripts/ticket-stats.py --input normalized-issues.json
python3 .agents/skills/report-tickets/scripts/test-ticket-stats.py
```

Optional `--aliases verified-people.json` requires an explicit confirmed login-to-person mapping.
Optional `--in-progress-status` selects the actual board value. Without aliases, report GitHub
accounts only. Shared tickets count once overall and once for each distinct assignee; owner totals
can therefore exceed unique tickets. Status totals and assignment totals must reconcile with the
detail inventory. The helper has no network or publication capability and cannot prove collection
completeness. Keep raw source exports temporary and secrets out of output.
