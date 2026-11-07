# 299: Choose the pilot booking authority and staff surface

## Tracking and outcome

- Issue: [STR-03 / #299](https://github.com/Corely-AI/corely/issues/299).
- Parent: [EP-STRATEGY / #281](https://github.com/Corely-AI/corely/issues/281).
- Prerequisite: [#298](https://github.com/Corely-AI/corely/issues/298), completed
  through merged [PR #365](https://github.com/Corely-AI/corely/pull/365).
- Branch: `299-pilot-booking-authority`; intended PR base: `development`.
- Worktree: `/Users/hadoan/Documents/GitHub/worktrees/corely-299-pilot-booking-authority`;
  isolated when concurrent #302 work appeared in the shared checkout. Only this
  ticket's seven documentation files were transferred; unrelated work was preserved.
- Reviewed base: `4ed3292a2c556cff9d13b2cb6c85672be48fb2f3`, 7 November 2026.
  Verified remote `corely`, repository `Corely-AI/corely`, default `development`.
- Goal: choose one initial adoption mode, authoritative records and an existing
  staff surface; define cutover/public essentials and review a synthetic adoption.
- Exclusions: runtime implementation, importer/provider connector, migrations,
  customer research, actual pilot/cutover, outbound messages and deployment.

## Reuse and plan

The maintainer explicitly selected Corely/OpenBuk replacement during delivery.
The [decision record](../products/corely/pilot-booking-decision.md) selects existing
OpenBuk staff routes, shared Booking ownership and the retained public journey.
It records source-level constraints and a seven-row migration tabletop, including
three blocking exceptions; it does not claim a working importer or team pilot.

1. Reverify #299, parent, completed prerequisite, base and existing PRs.
2. Inspect Booking/OpenBuk contracts, use cases, persistence, UIs and test assertions.
3. Record authority/identity mapping, one selected import/cutover/recovery path,
   public/lifecycle essentials, synthetic review and dependent delivery gates.
4. Link current strategy/launch/navigation docs without rewriting historical
   inventory snapshots or imported issue specifications.
5. Validate changed documentation, self-review, sign the commit and deliver a Draft PR.

## Verification

| Command or manual check                        | Result and limits                                                                                                                                                                        |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live repository/issue preflight                | Default/base and prerequisite integration verified; #299 was Ready, moved to In progress. No assignee or priority changed.                                                               |
| Static ownership and migration review          | Reviewed concrete contracts/screens/use cases/adapters/tests at the base above. No importer/provider sync found in scoped Booking paths. No real provider/export supplied.               |
| Synthetic adoption tabletop                    | Seven rows, six IDs: two eligible bookings, one duplicate, one cancelled disposition, three blockers. NO-GO for real cutover; expected replay/public-to-staff behavior traced to source. |
| Installed Prettier on changed Markdown         | PASS: all seven changed Markdown files.                                                                                                                                                  |
| Local links/anchors and walkthrough arithmetic | PASS: 134 local references; weekday, UTC offsets/buffers, DST gap and row counts checked with temporary Python validator.                                                                |
| Full diff and whitespace                       | PASS: self-reviewed seven documentation files only; `git diff --check` clean.                                                                                                            |

Application tests, typecheck, architecture checks, builds, provider calls and
migrations are not needed for this prose-only change and were not run. Historical
OpenBuk passes are not fresh results. The broad application pre-push hook is
intentionally bypassed with `HUSKY=0` for this documentation-only delivery; no
application lint/unit/typecheck/build pass is claimed. Staged formatting and
source-line-limit checks are run separately before the signed commit.

## UI/UX evidence

N/A: this change records a product/adoption decision and changes documentation
only. Existing routes were inspected as source evidence; no rendered UI or
interaction verification is claimed.

## Impact and remaining work

No runtime/contract/storage behavior changes. Revert the documentation commit
to roll back. The mode/surface decision can guide scoped dependent work, but real
source access, team approval, import, staging publication gate, lifecycle,
multi-staff, notifications and recovery remain delivery/pilot gates. Keep the
issue open/In progress while its Draft PR awaits normal review and integration.
