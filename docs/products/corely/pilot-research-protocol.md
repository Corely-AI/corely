# Pilot research protocol and measurement dictionary

7 November 2026 · [STR-04 / #300](https://github.com/Corely-AI/corely/issues/300),
under [EP-STRATEGY / #281](https://github.com/Corely-AI/corely/issues/281).
This defines proposed research, not findings, a recruitment commitment or pilot
authorization. **No participants, interviews, usage, payments or outcomes have
been collected for this protocol.** No pilot start/end dates are set.

Use the [launch proposal](launch-plan.md), selected
[OpenBuk replacement decision](pilot-booking-decision.md),
[reuse inventory](p1-p2-backlog/capability-reuse-inventory.md) and
[P2 promotion checklists](p2-promotion-criteria.md). Actual evidence and decisions
belong to [REL-04 / #334](https://github.com/Corely-AI/corely/issues/334);
a completed protocol cannot complete that ticket.

## Hypothesis, participants and recurring problem

The audience hypothesis is Germany-first appointment-led service teams,
initially beauty/wellness, with approximately 5–30 staff and one to three
locations. Neither this segment nor its willingness to switch/pay is validated.
Do not generalize results to all German teams, all service businesses or product-market fit.

| Role / context       | What to establish with the participant                                                                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Buyer / budget owner | Owner or general manager who can approve tool adoption and a package purchase. Identify the actual decision-maker and budget process; do not assume every manager can buy.                                                                              |
| Operational manager  | Person reconciling appointments, staffing and follow-up. Observe where information is checked, copied, corrected or chased during a normal operating day.                                                                                               |
| Staff users          | Consenting staff who perform assigned work, view their permitted schedule or submit requests. Include staff perspectives separately from manager demonstrations; account, employee and bookable resource are distinct identities.                       |
| Existing tools       | Ask for the actual booking system, staffing calendar/roster, task/checklist method, request channel and any specialist tools. Paper, spreadsheets and chat are prompts to investigate, not tools claimed to be in use.                                  |
| Recurring problem    | Hypothesis: repeated reconciliation and unclear follow-up ownership cost time or cause missed work. Record actual frequency, consequence, workaround and who experiences it. An isolated absence story is insufficient evidence of a recurring problem. |

Propose 6–10 discovery conversations across managers, buyers and staff, including
people unwilling to switch. This is a planning range, not a sample already
recruited or a representative survey. Ask about the last concrete instance,
observe the current workaround when permitted, then ask what would make adopting
or rejecting Corely sensible. Do not lead with the 32-app catalog.

Record recruitment route, exclusions, refusals, withdrawals and negative findings.
Convenience recruitment, enthusiastic owners and researcher assistance can bias
results. Keep “said they wanted it” separate from observed behavior.

## Small pilot and entry gates

Propose **2–3 teams**, with **five comparable baseline operating days** per team
and **4–6 pilot weeks after readiness**, following the launch proposal. These are
candidate observation windows, not dates, delivery promises or validated sample
sizes. Agree actual participation, windows and feasibility before collecting data.
Baseline observation does not require installing or migrating Corely.

Before admitting a team to live operation, record:

- The buyer, operational lead, consenting role cohorts and a research/support
  contact, with actual people recorded privately when known. Participation must
  not become an employee productivity evaluation.
- The normal-day problem, actual tools, operating days, locations, workload and
  a baseline collection method. Match comparable days/roles and note holidays,
  staff changes, unusual demand and researcher assistance rather than hide them.
- The selected replacement mode, accessible export, stable identity mapping,
  source/write freeze, publication controls and reconciled import/recovery
  evidence required by the booking decision. A second manually maintained
  live schedule is not an acceptable adoption workaround.
- Demonstrated role/tenant/workspace access, restricted personnel data, current
  booking lifecycle/concurrency, notifications where promised, public booking,
  mobile/locales, manual fallback and recovery under the existing
  [launch gates](launch-plan.md#ai-evaluation-and-release-gates). Configuration
  metadata or a merged PR alone does not establish any of these gates.
- A frozen protocol version, agreed metric definitions, proposed decision
  thresholds, recurring support budget and approved commercial-test approach.
  Unknown rates, prices or budgets stay unknown; do not replace them with guesses.

If a target capability is unavailable, use synthetic rehearsal to identify the
gap or defer that scenario. Do not count a prototype demonstration as live team
adoption. The current [package configuration](../../platform/operational-package.md)
explicitly reports undelivered Team/Daily Work; this protocol does not implement them.

## Two scenarios to observe

### Normal operating day

1. Observe an authorized manager/staff user finding today's appointments and
   neutral availability in the current workflow. During a ready pilot, repeat
   the equivalent task on the selected OpenBuk surface, with its source and
   actual fetch/error behavior recorded.
2. Follow opening/closing work or a real follow-up from assignment through
   completion: who owns it, what is due, what needs approval and where a permitted
   instruction is found. Measure coordination, not time spent delivering the
   customer service itself. Do not substitute CRM/workflow tasks for employee Tasks.
3. Check one pending decision and one change in the schedule/workload. Record
   repeat data entry, errors, unresolved work and support interventions, including
   cases where the existing tool performs better.
4. Repeat the core workflow with AI disabled or unavailable. If AI is evaluated,
   keep manual and AI-assisted observations separate and include human review
   and correction time in the assisted result.

### Absence exception

1. Use a consented real operational case only when appropriate; otherwise use
   a synthetic unavailable interval and explicitly label the exercise rehearsed.
   Do not collect medical explanations, private attachments or absence reasons
   to demonstrate the workflow.
2. An authorized approver decides in the private owning context. Operational
   views receive only necessary identity/resource, neutral unavailable interval
   and version/lifecycle. Inspect affected bookings and work without exposing
   the reason or changing historical commitments.
3. A manager resolves the impact manually, or reviews source-linked AI proposals.
   Deterministic checks must revalidate current authority, availability and stale/
   concurrent changes before execution. AI-originated sensitive changes and
   external messages require authorized confirmation. Do not automatically
   cancel/reassign/message in this proposed flow; existing explicitly configured
   deterministic automations retain their separately reviewed policies.
4. Observe correction/cancellation of the absence effect and recovery after a
   failure or stale proposal, including audit/retry evidence from owning features.
   A denied action is a test outcome, not completed useful work.

An absent real exception is **not observed**, not “zero coordination cost” or
successful validation. Synthetic/rehearsed exceptions test usability and safeguards;
only naturally observed frequency/consequences can support a recurring-demand claim.

## Measurement dictionary

Use one versioned dictionary across baseline and pilot. Record data source,
coverage and method changes; show each team's result before any pooled summary.
Missing data is **unknown**, a zero denominator is **N/A**, and neither means zero
cost, zero failures or success. Researcher-directed demos and synthetic events
never enter adoption or commercial denominators.

A meaningful action resolves real operational work: for example, answering a
schedule question needed for today's service, completing assigned work or
reviewing a request. A passive screen opening without that outcome does not
qualify. Freeze these qualifying actions before observation; reading an agenda
for an actual coordination decision need not create or edit a record.

| Measure              | Definition / unit and denominator                                                                                                                                                                                        | Collection and interpretation                                                                                                                                                                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coordination effort  | Sum active minutes spent locating/reconciling schedule information, assigning/chasing work and resolving decisions, per observed team-day, split by role cohort. Count a person's minute once, even when multitasking.   | Use the same consented observation/diary method before/after. Exclude customer-service delivery, setup/training and researcher interview time; record those separately. Include AI review/correction when used. Report comparable-day medians and observed days, not a manager-only average presented as team savings.           |
| Relative change      | `(baseline median minutes − pilot median minutes) / baseline median minutes × 100`. Baseline must be positive and observation scopes comparable.                                                                         | Report paired team results and context. If baseline is zero, report N/A; if missing, report unknown. Do not aggregate different teams' baseline/pilot totals into a causal claim.                                                                                                                                                |
| Repeat use           | For each team and role cohort, operating days with at least one voluntary, meaningful completed operational action divided by eligible observed operating days, per week. Report days and fraction.                      | Logins, passive page opens, automated events, duplicates and required demos do not qualify. Freeze eligible role cohorts and access beforehand; report access failures, nonparticipation and withdrawals rather than removing unsuccessful adopters after the fact. This is aggregate research, not staff scoring.               |
| Staff reach          | Consenting, access-eligible staff with meaningful voluntary use during the observation window / all consenting, access-eligible staff enrolled at its start.                                                             | Report aggregate coverage and missing observations alongside manager/staff repeat-use days. Suppress identifying small-group details. A manager using the app for everyone does not establish employee adoption.                                                                                                                 |
| Missed follow-up     | Due operational items left unresolved at the agreed cutoff / all observed items due in that window; show counts and cutoff definition.                                                                                   | Follow the same item scope and lateness rule before/after. Separate deliberate cancellation, blocked work and unknown completion. A smaller measured workload alone is not improvement.                                                                                                                                          |
| Willingness to pay   | Ordered evidence: expressed interest → explicit response to an approved package/price offer → documented buyer commitment → actual paid adoption with a verified transaction. Report team counts at each distinct stage. | Record what was offered, authority, terms, acceptance/refusal and evidence source. No prices are approved here. A signup, free OpenBuk usage, hypothetical survey answer or unpaid commitment is not a payment. This protocol authorizes no charge, invoice or sales message.                                                    |
| Support burden       | Recurring support minutes / team / observed operating week; setup/training minutes reported separately. Identify researcher-assisted sessions.                                                                           | Classify onboarding, incident, how-to, data correction and workaround effort. Include engineering investigation attributable to the team; do not hide it outside support. Proposed cost = minutes/60 × agreed hourly cost + attributable provider costs, with currency/basis recorded. Missing rates mean currency cost unknown. |
| AI review effort     | Total human review/correction minutes / reviewed proposals, with total proposals, reviewed, accepted, rejected and unreviewed counts shown.                                                                              | Include rejected/stale proposals in review time. Compare the full assisted workflow with an equivalent manual workflow. AI unavailable/off yields N/A AI rates, while manual workflow success remains measurable.                                                                                                                |
| AI correction rate   | Reviewed proposals needing substantive correction / all reviewed proposals. Also report accepted unchanged, rejected, stale, permission-denied and unsupported-source cases separately.                                  | A revised suggestion is not an executed action. Do not treat unreviewed proposals as correct, or denominator-zero as zero correction. Retain permitted source references and uncertainty; do not store personnel reasons in research logs.                                                                                       |
| Reliability / access | Unauthorized actions, private-data exposures, conflicting confirmations, stale-action acceptance and failed/retried outcomes in the explicitly defined evaluation set; show cases attempted and observed.                | Separate synthetic safety cases from natural incidents. Proposed hard gate: no unauthorized action or private-data exposure in that set, with other release gates satisfied. Passing a finite set is not a universal safety/compliance claim.                                                                                    |
| Adoption feasibility | Reconciliation exceptions, unresolved source IDs, duplicate manual entry, frozen-write violations and recovery failures per attempted cutover/rehearsal, plus time/support required.                                     | Keep rehearsed and real attempts separate. No live cutover before the selected authority/recovery gates; successful app configuration is not successful migration.                                                                                                                                                               |

## Evidence handling and review

Record one entry per observation or artifact, using these fields. This is a
collection template, not instrumentation implemented by this ticket:

| Field                | Required content                                                                                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity and version | Evidence ID, protocol version, team pseudonym, role cohort and scenario. Keep the real identity/account/workspace mapping in restricted storage, outside the repository.                       |
| Time and scope       | Actual collection time with timezone, baseline/pilot window, observed operating days, workload/locations and access-eligible cohort. No observation dates have been scheduled here.            |
| Evidence class       | Naturally observed, self-reported, researcher-directed rehearsal, synthetic, commercial commitment or verified payment. Do not silently upgrade a class.                                       |
| Measurement          | Metric ID/name, numerator, denominator/unit, method, data coverage and unknown/N/A reason. Link an authorized source and record freshness.                                                     |
| Conditions           | Existing tools/authority, AI on/off, support interventions, errors, missing observations, refusals, withdrawals and alternative explanations.                                                  |
| Access and retention | Consent/participation record, permitted viewers, retention/deletion decision and redacted source reference, agreed before collection. Restrict small-cohort results that could identify staff. |
| Review               | Operational lead/researcher review, buyer feedback where relevant, corrections and decision reference. Assign actual people later; this protocol invents no reviewer accounts.                 |

Store private source artifacts in an authorized existing document location with
its real access controls; do not commit customer records, payment documents,
staff identities, prompts containing private data or raw recordings. Publish
only an appropriately redacted decision summary and authorized evidence links.
Confirm applicable privacy/employment/recording and commercial requirements with
appropriate reviewers before research; this document provides no legal certification.

## Proposed decision rules — freeze before measurement

These thresholds are **unvalidated proposals**, not approved success targets.
The buyer/research lead must agree and record the actual rules before the first
pilot measurement. Version later changes, explain why and report results against
the original rules as well; do not select favorable thresholds after seeing results.

- Candidate repeat-use threshold: both manager and staff cohorts voluntarily
  complete meaningful work on at least three eligible operating days per week
  in each of the final two observed weeks. If the operating pattern provides
  fewer than three days, agree an appropriate fraction beforehand; report the
  actual denominator rather than mechanically classify it as failure/success.
- Candidate value threshold: at least 20% reduction in comparable team-day median
  coordination effort, without worsening missed follow-up, and with recurring
  support within the team's explicitly agreed budget. These are hypotheses to
  calibrate, not market benchmarks. AI-assisted benefit includes review time.
- Require credible buyer/commercial evidence at its actual stage and feasible
  single-authority adoption. Missing price/budget/support evidence remains an
  unresolved commercial gate, even when the time metric improves.
- Pause live evaluation for unauthorized actions or private-data exposure, failed
  authority/reconciliation or unsafe recovery. Follow existing incident ownership;
  a release blocker cannot be offset by better adoption metrics.

For each team record **continue, refine/narrow, stop or insufficient evidence**
with dissent and limits. A numerical pass alone cannot authorize expansion.
Then review each P2 epic separately against its
[specific checklist](p2-promotion-criteria.md). Missing evidence leaves it
conditional; a small pilot cannot establish product-market fit.

## Synthetic dictionary review

This is an arithmetic/decision exercise only, with **no actual participant or
pilot observation**. Suppose five comparable baseline days each contain 60
coordination minutes and five pilot days each contain 45, including any AI review.
The medians are 60 and 45; relative reduction is `(60−45)/60 = 25%`.
Three meaningful staff-use days out of five eligible days is 60% for that week;
it says nothing about the second week, staff reach or another team's adoption.

Suppose five AI proposals contain four reviewed proposals, two needing substantive
correction, with ten review minutes. Correction rate is `2/4 = 50%`; review effort
is `10/4 = 2.5 minutes` per reviewed proposal. The fifth, unreviewed proposal is
unknown. Ninety recurring support minutes is 1.5 hours per team-week; monetary
cost is unknown without an agreed rate/provider cost. Interest without an offer,
commitment or transaction remains expressed interest.

Even this hypothetical 25% improvement cannot promote a P2 epic: there is no
real evidence, two-week/role coverage, agreed support budget or verified commercial
result. A zero-day/zero-proposal observation produces N/A rates, never an automatic
pass. Reviewers can use these examples to check the dictionary before collecting
real observations. **All actual evidence remains uncollected.**
