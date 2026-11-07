# 300: Define pilot evidence and P2 promotion criteria

## Tracking and outcome

- Issue: [STR-04 / #300](https://github.com/Corely-AI/corely/issues/300).
- Parent: [EP-STRATEGY / #281](https://github.com/Corely-AI/corely/issues/281).
- Prerequisite: #299, integrated through PR #366; actual evidence review remains
  [REL-04 / #334](https://github.com/Corely-AI/corely/issues/334).
- Branch: `300-pilot-evidence-and-promotion`; intended PR base: `development`.
- Verified remote/default: `corely`, `Corely-AI/corely`, `development` at
  `440c6a3ff954e18184addf550650be166b14e245`, 7 November 2026.
- Worktree: `/Users/hadoan/Documents/GitHub/worktrees/corely-300-pilot-evidence-and-promotion`.
  Replaced the clean, merged #301 worktree; primary #302 work was preserved.
- Selection: remaining Ready tickets had unmerged #302 prerequisites (Draft #368).
  #300 was the next unblocked P1 Backlog slice; moved only #300 to In progress.
- Goal: a usable research protocol/dictionary and explicit conditional promotion
  checklists for all eight P2 epics, without fabricated customer evidence.
- Exclusions: recruitment, messages, interviews, payments, actual pilot execution,
  instrumentation, application code, P2 promotion/implementation and deployment.

## Reuse and implementation

Reuse the current strategy, launch proposal, selected OpenBuk replacement,
STR-01 inventory and existing P2 epics #290–#297. Source owners are candidates
from that inventory, not newly audited or recreated by this documentation.

- [Pilot research protocol](../products/corely/pilot-research-protocol.md):
  audience/buyer/staff/tools hypotheses, entry gates, normal-day/absence scenarios,
  comparable baseline/pilot windows, dictionary, evidence handling and proposed
  pre-agreed decision thresholds. Arithmetic review is explicitly synthetic.
- [P2 criteria](../products/corely/p2-promotion-criteria.md): common and individual
  problem/reuse/evidence checklists, exact epic links, conditional/not-committed
  state and a future decision record. No epic is promoted.
- Link the maintained documents from product/launch/backlog/docs navigation;
  preserve historical inventory and original imported issue specifications.

## Verification

| Check                                         | Actual result / limit                                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live issue/project/dependency review          | #300 open; #299 and #301 merged; remaining Ready queue blocked on #302. Existing epic scope/priority preserved.                                   |
| Acceptance / protocol review                  | PASS: all four issue criteria traced to protocol/checklists; synthetic rehearsal and actual evidence remain distinct.                             |
| Eight-epic coverage and synthetic arithmetic  | PASS: all eight live epics #290–#297, 24 individual/6 common checklist items and measurement examples verified with a temporary Python validator. |
| Installed Prettier / local links / whitespace | PASS: seven Markdown files, 141 local references/anchors and `git diff --check`.                                                                  |

Documentation only. No application tests, migrations, provider calls, customer
research or market/legal verification were performed. Proposed thresholds are
unvalidated and must be agreed before measurement; all actual evidence remains
uncollected. No historical runtime check is presented as a fresh passing result.
The broad application pre-push hook is intentionally bypassed with `HUSKY=0` for
this prose-only delivery; staged formatting and source-line-limit checks run
separately before the DCO-signed commit. No hosted CI pass is claimed.

## UI/UX evidence

N/A: maintained research/decision documentation only; no product interface or
behavior changes. No screenshots or rendered acceptance are claimed.

## Impact and remaining work

No runtime/schema/data changes; rollback is reverting these documents/navigation
links. Keep this ticket open/In progress pending Draft PR review/integration.
Real participant consent/qualification, baseline observations, pilot readiness,
commercial evidence and individual P2 decisions remain future work under their
existing owners and REL-04; this plan alone cannot complete that evidence review.
