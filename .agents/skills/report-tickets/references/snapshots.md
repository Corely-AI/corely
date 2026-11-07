# Optional snapshots and comparisons

For requested saved reports/history use `docs/tasks/ticket-reports/<UTC-timestamp>.json`, or the
destination specified by the user. This is a proposed storage convention for new saved reports;
do not claim earlier snapshots exist or require repository writes for a one-off chat answer.

Save a small record containing:

- Repository and Project node ID/number, filters, owners, report kind and timezone.
- Collection start/end, page completion/counts and unavailable/redacted/archived coverage.
- One normalized row per scoped issue with URL, number, exact title/state/status/assignees and update time.
- Reconciled statistics, evidence limitations and the comparable baseline filename when available.
- Movement with old/new values and verified observations for previously open issues now missing.
- Confirmed publication receipts only if separately requested and actually delivered.

Compare only matching repository/Project/filter scopes with adequate complete coverage. Focused
and count-only reports cannot silently replace a full-board baseline. If no comparable baseline
exists, say so. Verify issue state and membership before labeling a missing item closed or removed;
keep inaccessible cases unresolved. A status/owner/count change is recorded workflow movement,
not proof of implementation, acceptance or deployment.

Preserve prior snapshots and minimize fields. Do not persist raw comments, bodies, secrets, personal
data or giant API exports, and do not commit report artifacts unless requested.
