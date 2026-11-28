# Conditional P2 promotion criteria

7 November 2026 · [STR-04 / #300](https://github.com/Corely-AI/corely/issues/300).
All eight epics below are **conditional / not committed**. Evidence for these
promotion decisions is **not collected**; none is promoted by this document.
Existing capabilities remain maintained regardless of new investment priority.

Use the [research protocol and measurement dictionary](pilot-research-protocol.md)
and the [STR-01 reuse inventory](p1-p2-backlog/capability-reuse-inventory.md).
Owner references below are reuse candidates from that inspection, not a fresh
runtime audit or permission to create domains, tables or product subscriptions.

## Common evidence-to-promote checklist

For each epic, attach a separately reviewed decision under
[REL-04 / #334](https://github.com/Corely-AI/corely/issues/334), or a documented
equivalent, **before implementation**. Discovery and backlog creation can proceed
without promotion. Missing evidence means defer/continue discovery, not “passed.”

- [ ] Cite actual recurring customer problems, affected buyer/staff roles,
      frequency/consequences and current workarounds, including negative evidence.
      Proposed minimum: recurrence observed across at least two independent teams;
      agree the actual rule before measurement and disclose the small sample.
- [ ] Compare repeat use and value against each team's baseline using the
      dictionary; show staff participation, coverage, support cost and AI review
      effort. Separate natural use, rehearsals, synthetic checks and expressed interest.
- [ ] Record the commercial evidence stage, feasible adoption/source access,
      support budget and remaining uncertainty. A free signup is not paid adoption.
- [ ] Reinspect existing owners/contracts/routes/issues, and define the smallest
      missing outcome, dependencies, exclusions and testable acceptance. Do not
      duplicate Party, Booking, Documents, approvals, billing or permissions.
- [ ] Resolve applicable access/privacy/reliability and specialist-review gates
      for that slice; retain manual paths and deterministic validation/confirmation.
- [ ] Record a human decision-maker, evidence references, exact promoted scope,
      explicit non-goals and rationale. Keep unrelated P2 epics conditional. No
      dates, budget commitments, reviewers or implementation work are invented here.

## EP-SHIFTS — #290

[Epic](https://github.com/Corely-AI/corely/issues/290) ·
[reuse evidence](p1-p2-backlog/capability-reuse-inventory.md#ep-shifts).
**State: conditional / not committed. Evidence: not collected.**
Problem hypothesis: managers repeatedly cannot plan/publish coverage or resolve
swaps using working patterns and appointment availability alone.

- [ ] Show recurring uncovered/overlapping assignments and the cost of existing
      roster work; distinguish a normal coverage problem from a single absence.
- [ ] Choose roster authority and its relationship with People/Booking neutral
      availability; distinguish rosters from appointments, actual worked hours
      and POS register sessions. Assess existing owners before proposing storage.
- [ ] Review working-rule/privacy constraints and a bounded publication/swap
      workflow with stale/concurrent decisions. No payroll, autonomous staff
      allocation or claim of labor-law certification.

## EP-TIME — #291

[Epic](https://github.com/Corely-AI/corely/issues/291) ·
[reuse evidence](p1-p2-backlog/capability-reuse-inventory.md#ep-time).
**State: conditional / not committed. Evidence: not collected.**
Problem hypothesis: employees and managers repeatedly struggle to inspect,
correct or export actual time using their existing recording workflow.

- [ ] Choose working-time recording **or** project timesheets, supported by actual
      users and the intended downstream recipient; do not combine both by default.
- [ ] Verify one integration-first source's access, identity, authority, freshness,
      permitted writes/export and revocation/recovery using synthetic proof, then
      record an integrate/build decision. An integration folder is insufficient.
- [ ] Review correction/history and export acceptance with the recipient and
      applicable requirements. Never infer worked time from shifts/appointments;
      exclude payroll, passive monitoring and employee productivity scores.

## EP-EXPENSES — #292

[Epic](https://github.com/Corely-AI/corely/issues/292) ·
[reuse evidence](p1-p2-backlog/capability-reuse-inventory.md#ep-expenses).
**State: conditional / not committed. Evidence: not collected.**
Problem hypothesis: employee claims, receipts and accountant handoff require
recurring chasing/re-entry that the team's current process does not solve.

- [ ] Observe real claim frequency, handling time, errors and recipient needs;
      distinguish employee reimbursement claims from general expense capture.
- [ ] Assess existing Expenses/Party/Documents/Approvals and current UI/exports;
      demonstrate the residual gap before adding a parallel claim/receipt store.
- [ ] Review approval, reimbursement evidence and accounting handoff as separate
      states, including duplicates/corrections and supervised extraction. No
      autonomous payment or mandatory native ledger/Accounting activation.

## EP-ASSETS — #293

[Epic](https://github.com/Corely-AI/corely/issues/293) ·
[reuse evidence](p1-p2-backlog/capability-reuse-inventory.md#ep-assets).
**State: conditional / not committed. Evidence: not collected.**
Problem hypothesis: lost equipment, unclear custody or handovers repeatedly
interrupt the team's work and are poorly served by its existing register.

- [ ] Show recurring custody/location/handover failures and actual cost or delay;
      identify the physical equipment and accountable operating role.
- [ ] Assess Inventory, Booking resources, Party and Documents reuse; decide only
      the residual register/custody ownership and stable identifiers needed.
- [ ] Verify assignment/return conflicts, condition evidence, authorized document
      access and a usable handover path. Exclude stock ledgers, depreciation and
      fixed-asset accounting unless independently scoped and promoted later.

## EP-HELPDESK — #294

[Epic](https://github.com/Corely-AI/corely/issues/294) ·
[reuse evidence](p1-p2-backlog/capability-reuse-inventory.md#ep-helpdesk).
**State: conditional / not committed. Evidence: not collected.**
Problem hypothesis: one internal support function has recurring requests whose
volume, lost ownership or response delays justify a shared queue.

- [ ] Measure actual volume, response/reopen patterns and workarounds; select
      one IT, HR or facilities function and a responsible operator, not all three.
- [ ] Assess existing Issues and authorized Knowledge/Documents reuse before
      new ownership; define private notes and the smallest intake/resolution flow.
- [ ] Verify private-data boundaries, manual support, reviewed source-linked AI
      drafts and simple response targets. Do not turn this into customer-service
      CRM or expose personnel reasons in operational/search contexts.

## EP-INVOICES — #295

[Epic](https://github.com/Corely-AI/corely/issues/295) ·
[reuse evidence](p1-p2-backlog/capability-reuse-inventory.md#ep-invoices).
**State: conditional / not committed. Evidence: not collected.**
Problem hypothesis: teams actually need outgoing customer invoices in their
operational workflow and their existing billing tool/handoff is inadequate.

- [ ] Observe the real billing need, volumes, corrections, delivery/receivable
      work and recipient expectations; compare reuse/integration with current tools.
- [ ] Reinspect Invoices, Party, Tax and Documents; define only missing lifecycle,
      provenance and deterministic amount/numbering behavior. Customer invoices
      remain separate from Corely subscription billing.
- [ ] Select the exact jurisdiction/document/export scope with appropriate
      accountant/specialist review and fixture/recipient acceptance. No general-ledger
      migration prerequisite, duplicate accounting engine or blanket compliance claim.

## EP-BILLS — #296

[Epic](https://github.com/Corely-AI/corely/issues/296) ·
[reuse evidence](p1-p2-backlog/capability-reuse-inventory.md#ep-bills).
**State: conditional / not committed. Evidence: not collected.**
Problem hypothesis: repeated supplier-document intake, duplicate review or
accountant handoff creates material chasing or re-entry for the buyer/operator.

- [ ] Observe document volume, duplicates, due-date handling, corrections and
      actual supplier/accountant handoff needs in the current process.
- [ ] Reuse Purchasing/VendorBill, Party supplier identity, Documents and existing
      approval/payment records; demonstrate the missing delta, not a new payable ledger.
- [ ] Agree reconciliation/export and permission rules that distinguish approval,
      due amount and settlement. Preserve originals and source IDs; no bank-detail
      changes, autonomous payment or fund release follows from this promotion.

## EP-BUDGETS — #297

[Epic](https://github.com/Corely-AI/corely/issues/297) ·
[reuse evidence](p1-p2-backlog/capability-reuse-inventory.md#ep-budgets).
**State: conditional / not committed. Evidence: not collected.**
Problem hypothesis: owners repeatedly need a dependable plan-versus-spend view,
and existing reports/spreadsheets fail to explain commitments and actuals.

- [ ] Demonstrate that decision need and verify at least one reliable spending
      source. Expenses, Purchasing or an external source are alternatives, not
      mandatory simultaneous dependencies.
- [ ] Agree basis, period, currency, source identity and treatment of commitments,
      actuals, cancellations, refunds and corrections; reconcile a worked lifecycle
      example without counting one transaction twice.
- [ ] Assess Reporting and existing source owners before choosing the residual
      plan/projection owner. Define advisory variance and authorized freshness/
      explanation behavior; no replacement ledger or automatic spending blocks.

## Decision record to complete later

For **each** epic, record: actual evidence references/classes and collection
windows; teams/roles/coverage and counterevidence; baseline comparison; commercial
stage and support economics; reuse/source decision; reviewed safeguards; named
decision-maker; **promote a bounded slice, defer/discover, or reject**; rationale,
remaining uncertainty and conditions for reconsideration. A promotion cannot be
inferred from a label, closed dependency, merged code or successful synthetic test.

Current decision for all eight: **conditional / not committed; actual evidence
not collected; no P2 implementation authorized by STR-04**. REL-04 must attach
real evidence and a separate decision. Maintenance of existing domains is unaffected.
