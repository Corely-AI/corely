# Corely P1/P2 backlog import — 7 November 2026

Completed in the existing [Corely Project #1](https://github.com/orgs/Corely-AI/projects/1/views/1).
This is a planning import, not application implementation or a launch-readiness claim.

## Coverage

| Scope                      | New epics | New features | Existing completed coverage | Logical entries |
| -------------------------- | --------: | -----------: | --------------------------: | --------------: |
| P1 — focused launch        |         9 |           37 |                           1 |              47 |
| P2 — conditional expansion |         8 |           30 |                           0 |              38 |
| Total                      |        17 |           67 |                           1 |              85 |

- Created **84 issues**; reused/updated/reopened existing issues: **0**; blocked entries: **0**.
- `STR-02` is covered by [the existing documentation-alignment commit](https://github.com/Corely-AI/corely/commit/26d611e510c785ccad78341f6564ecdcf05de770); no duplicate delivery issue was created.
- Of the new issues, 52 describe a partial gap around existing work; 32 describe proposed slices with no exact existing equivalent found. These are reconciliation dispositions, not runtime absence or completion claims.
- All 13 requested catalog apps are covered; no P3/P4 epic was introduced.
- Every new issue was read back in Project #1 with **Backlog** status. Native Feature type applies to all 67 features; `type:epic` identifies the 17 epics.
- Scope is stored in `roadmap:p1` / `roadmap:p2` labels under `initiative:internal-ops-v1`; every P2 issue also has `conditional`. Existing Priority conventions were preserved. No assignees, estimates, dates, iterations or milestones were invented.

## Hierarchy and dependencies

Read-back verified **67 native parent/sub-issue relationships** and **154 native blocked-by edges**. All issue bodies include resolved links; epic checklists link their children. `STR-02` is checked as completed evidence, while all newly created delivery criteria remain open.

The supplied baseline has 155 hard prerequisite edges. The one outgoing prerequisite on already-completed `STR-02` does not need a new GitHub dependency, leaving 154 native edges. Both the hard graph and the graph including conditional promotion are acyclic.

`REL-04` is a linked implementation-promotion gate for P2. It does not block ticket creation or limited discovery. Budgets retains alternative source choices (`EXP-03`, `BILL-03` or a verified equivalent), without making them an AND dependency.

| Epic                                                                                                                        | Scope | New feature children |
| --------------------------------------------------------------------------------------------------------------------------- | ----- | -------------------: |
| [EP-STRATEGY](https://github.com/Corely-AI/corely/issues/281) — Confirm the launch package and reuse plan                   | P1    |                    3 |
| [EP-PLATFORM](https://github.com/Corely-AI/corely/issues/282) — Provide the shared operational workspace                    | P1    |                    4 |
| [EP-PEOPLE](https://github.com/Corely-AI/corely/issues/283) — Corely People — operational staff and availability            | P1    |                    4 |
| [EP-REQUESTS](https://github.com/Corely-AI/corely/issues/284) — Corely Requests — narrow forms and approvals                | P1    |                    3 |
| [EP-TASKS](https://github.com/Corely-AI/corely/issues/285) — Corely Tasks — daily work and recurring checklists             | P1    |                    4 |
| [EP-APPOINTMENTS](https://github.com/Corely-AI/corely/issues/286) — Corely Appointments and OpenBuk — dependable scheduling | P1    |                    7 |
| [EP-KNOWLEDGE](https://github.com/Corely-AI/corely/issues/287) — Corely Knowledge — private approved procedures             | P1    |                    3 |
| [EP-CONNECTED](https://github.com/Corely-AI/corely/issues/288) — Connect daily operations with controlled AI assistance     | P1    |                    5 |
| [EP-RELEASE](https://github.com/Corely-AI/corely/issues/289) — Verify pilot readiness and recoverability                    | P1    |                    4 |
| [EP-SHIFTS](https://github.com/Corely-AI/corely/issues/290) — Corely Shifts — coverage and published rosters                | P2    |                    4 |
| [EP-TIME](https://github.com/Corely-AI/corely/issues/291) — Corely Time — integration-first actual time records             | P2    |                    3 |
| [EP-EXPENSES](https://github.com/Corely-AI/corely/issues/292) — Corely Expenses — employee claims and accountant handoff    | P2    |                    4 |
| [EP-ASSETS](https://github.com/Corely-AI/corely/issues/293) — Corely Assets — equipment custody and handovers               | P2    |                    3 |
| [EP-HELPDESK](https://github.com/Corely-AI/corely/issues/294) — Corely Helpdesk — one internal support queue                | P2    |                    4 |
| [EP-INVOICES](https://github.com/Corely-AI/corely/issues/295) — Corely Invoices — bounded customer billing                  | P2    |                    4 |
| [EP-BILLS](https://github.com/Corely-AI/corely/issues/296) — Corely Bills — supplier documents and payable review           | P2    |                    4 |
| [EP-BUDGETS](https://github.com/Corely-AI/corely/issues/297) — Corely Budgets — advisory spending plans and variance        | P2    |                    4 |

## Existing work and inspection limits

Inspected local `development` at `53381f420d5fa5de1f3d7c4cc9ee6d76803d8e89`, with remote default `development` at `26d611e510c785ccad78341f6564ecdcf05de770`. Discovery covered all 77 repository issues, open and closed, all issue comments, repository PR metadata/bodies, relevant issue timelines and linked PR evidence, and all 73 original project items. The paginated project query found no archived or draft items and no remaining page. Inaccessible/redacted content was not inferred to be empty.

Existing issue fields and original project items were checked against the pre-write snapshot. Their titles, bodies, labels, assignments, state, milestone and project values were preserved. In particular, [Knowledge #130](https://github.com/Corely-AI/corely/issues/130) keeps its public Articles/FAQ/Glossary scope and P0 body metadata; the new private-procedure epic is distinct. [Forms #52](https://github.com/Corely-AI/corely/issues/52) remains closed/not_planned and is not treated as delivered evidence.

Reuse candidates are recorded per issue: Booking/OpenBuk, identity/workspaces, platform entitlements/menu, Forms/Approvals/Workflow, Documents/CMS, copilot/background/notifications, Expenses, Purchasing/VendorBill, Invoices, Inventory, Issues and Reporting. Related merged PRs include #280 (OpenBuk), #217 (Booking types), #106 (Issues), #113 (entitlements), #231 (notifications), #189 (command centre), and #171 (menu). PR state and source presence do not establish pilot acceptance.

Source/API review is static and scoped. No application tests, integrations, migrations, deployments, runtime implementation, commits or pushes were performed. Legal, customer-demand, pricing and production-readiness questions remain unvalidated. Historical test results in the imported source package remain historical.

## Suggested execution order

Completed documentation alignment (`STR-02`) is reused. The following dependency layers include the `REL-04` gate before P2 implementation; work within a layer can be assessed independently where ownership and environment allow.

1. [STR-01](https://github.com/Corely-AI/corely/issues/298).
2. [PLAT-02](https://github.com/Corely-AI/corely/issues/302), [STR-03](https://github.com/Corely-AI/corely/issues/299).
3. [KNOW-01](https://github.com/Corely-AI/corely/issues/323), [OPS-01](https://github.com/Corely-AI/corely/issues/326), [PEOPLE-01](https://github.com/Corely-AI/corely/issues/305), [PLAT-01](https://github.com/Corely-AI/corely/issues/301), [STR-04](https://github.com/Corely-AI/corely/issues/300).
4. [APT-01](https://github.com/Corely-AI/corely/issues/316), [PEOPLE-02](https://github.com/Corely-AI/corely/issues/306), [PLAT-03](https://github.com/Corely-AI/corely/issues/303), [PLAT-04](https://github.com/Corely-AI/corely/issues/304), [REQ-01](https://github.com/Corely-AI/corely/issues/309), [TASK-01](https://github.com/Corely-AI/corely/issues/312).
5. [APT-02](https://github.com/Corely-AI/corely/issues/317), [PEOPLE-03](https://github.com/Corely-AI/corely/issues/307), [PEOPLE-04](https://github.com/Corely-AI/corely/issues/308), [REQ-02](https://github.com/Corely-AI/corely/issues/310), [TASK-02](https://github.com/Corely-AI/corely/issues/313), [TASK-03](https://github.com/Corely-AI/corely/issues/314), [TASK-04](https://github.com/Corely-AI/corely/issues/315).
6. [APT-03](https://github.com/Corely-AI/corely/issues/318), [APT-04](https://github.com/Corely-AI/corely/issues/319), [APT-06](https://github.com/Corely-AI/corely/issues/321), [KNOW-02](https://github.com/Corely-AI/corely/issues/324), [OPS-02](https://github.com/Corely-AI/corely/issues/327), [REQ-03](https://github.com/Corely-AI/corely/issues/311).
7. [APT-05](https://github.com/Corely-AI/corely/issues/320), [APT-07](https://github.com/Corely-AI/corely/issues/322), [KNOW-03](https://github.com/Corely-AI/corely/issues/325), [OPS-03](https://github.com/Corely-AI/corely/issues/328), [REL-02](https://github.com/Corely-AI/corely/issues/332).
8. [OPS-04](https://github.com/Corely-AI/corely/issues/329), [OPS-05](https://github.com/Corely-AI/corely/issues/330), [REL-03](https://github.com/Corely-AI/corely/issues/333).
9. [REL-01](https://github.com/Corely-AI/corely/issues/331).
10. [REL-04](https://github.com/Corely-AI/corely/issues/334).
11. [ASSET-01](https://github.com/Corely-AI/corely/issues/346), [BILL-01](https://github.com/Corely-AI/corely/issues/357), [BUD-01](https://github.com/Corely-AI/corely/issues/361), [EXP-01](https://github.com/Corely-AI/corely/issues/342), [HELP-01](https://github.com/Corely-AI/corely/issues/349), [INV-01](https://github.com/Corely-AI/corely/issues/353), [SHIFT-01](https://github.com/Corely-AI/corely/issues/335), [TIME-01](https://github.com/Corely-AI/corely/issues/339).
12. [ASSET-02](https://github.com/Corely-AI/corely/issues/347), [BILL-02](https://github.com/Corely-AI/corely/issues/358), [BILL-03](https://github.com/Corely-AI/corely/issues/359), [BUD-02](https://github.com/Corely-AI/corely/issues/362), [EXP-02](https://github.com/Corely-AI/corely/issues/343), [EXP-04](https://github.com/Corely-AI/corely/issues/345), [HELP-02](https://github.com/Corely-AI/corely/issues/350), [INV-02](https://github.com/Corely-AI/corely/issues/354), [INV-03](https://github.com/Corely-AI/corely/issues/355), [SHIFT-02](https://github.com/Corely-AI/corely/issues/336), [TIME-02](https://github.com/Corely-AI/corely/issues/340).
13. [ASSET-03](https://github.com/Corely-AI/corely/issues/348), [BILL-04](https://github.com/Corely-AI/corely/issues/360), [BUD-03](https://github.com/Corely-AI/corely/issues/363), [EXP-03](https://github.com/Corely-AI/corely/issues/344), [HELP-03](https://github.com/Corely-AI/corely/issues/351), [HELP-04](https://github.com/Corely-AI/corely/issues/352), [INV-04](https://github.com/Corely-AI/corely/issues/356), [SHIFT-03](https://github.com/Corely-AI/corely/issues/337), [TIME-03](https://github.com/Corely-AI/corely/issues/341).
14. [BUD-04](https://github.com/Corely-AI/corely/issues/364), [SHIFT-04](https://github.com/Corely-AI/corely/issues/338).

## Artifacts and checks

- [Live issue map](corely-p1-p2-issue-map.json): one row for each of the 85 logical keys, with actual remote IDs, project membership, evidence, parent/dependency mappings, fields and verification.
- [Read-only reconciliation](reconciliation.json): the saved pre-write inventory and proposed changes.
- The original specification/body files remain planning inputs with prepared/null remote identifiers. Use the live map and stable markers for reruns.
- Structural validator, installed Prettier on imported Markdown/JSON and modified documentation, targeted local link checks, and `git diff --check` passed. These checks do not establish runtime behavior.
- The GitHub connector lacked project/relationship operations, so authenticated GitHub CLI/API was used. Initial issue creation did not expose project membership immediately; explicit project insertion and later read-back established membership for every issue.
