# ELSTER Submission Gap Report

> Date: 2026-03-11  
> Scope: current Kerniflow tax repo status vs. what is required to submit German tax data through ELSTER

## Executive summary

Kerniflow already has a substantial **German tax workflow surface**:

- tax filings and report lifecycle
- annual income / income tax assistant flows
- VAT filing export logic
- background jobs and artifact persistence
- an ERiC job model with `validate` / `submit` actions

However, the repo does **not** currently perform real ELSTER submission.

The existing ERiC / ELSTER path is a **scaffold**:

- payload mapping is stubbed
- background processing is stubbed
- there is no real ERiC runtime in this repo
- there is no live call to an ELSTER gateway
- there is no certificate onboarding or ELSTER developer credential flow

In practical terms: **Kerniflow can prepare tax data and simulate an ERiC job lifecycle, but it cannot yet submit tax declarations to ELSTER.**

## Official ELSTER constraints

Based on the official ELSTER developer information:

- ELSTER provides a dedicated **developer area** and requires developer onboarding/access.
- ELSTER submission is built around **ERiC**, the official client library used for validation and transmission.
- The deeper technical artifacts needed for production implementation appear to live behind the developer area and are not fully public.

Official sources:

- [ELSTER developer information](https://www.elster.de/eportal/infoseite/entwickler)
- [ELSTER transfer interface provision dates](https://www.elster.de/eportal/infoseite/schnittstellen)

Important inference:

- Because the detailed technical assets are gated, the exact production payload and submission requirements for each declaration type cannot be finalized from public pages alone. Kerniflow will need developer-area access before the final implementation phase.

## What Kerniflow has today

### 1. Core tax module and DE reporting foundation

The tax module is already large and structured enough to support a real submission pipeline:

- `services/api/src/modules/tax/tax.module.ts`
- `docs/features/tax-current-state.md`
- `docs/features/tax-income-tax-assistant.md`

Current strengths:

- DE jurisdiction support
- filing lifecycle and status model
- annual report generation
- EÜR report surface
- tax report persistence
- outbox/background integration

This is good foundation work. The missing part is the **transport and compliance integration layer**, not the basic tax module shape.

### 2. VAT export exists, but only as an export surface

There is a use case and builder for DE VAT XML export:

- `services/api/src/modules/tax/application/use-cases/export-tax-filing-elster-xml.use-case.ts`
- `services/api/src/modules/tax/application/services/tax-filing-export-eligibility.ts`
- `services/api/src/modules/tax/infrastructure/exports/de/ustva/de-ustva-tax-filing-export.builder.ts`

Current behavior:

- ELSTER XML export is only enabled for **DE periodic VAT filings**
- annual VAT does not get ELSTER XML here
- income tax / EÜR / annual income do not use this export path

Important limitation:

- The repo shows an `ELSTER_USTVA_XML` artifact type, but there is no end-to-end proof in the repo that this XML is being validated or transmitted through ERiC. It should currently be treated as an export format, not a production ELSTER transmission pipeline.

### 3. ERiC jobs exist as a domain/application scaffold

Kerniflow already models ERiC jobs:

- `packages/contracts/src/tax/tax-eric-jobs.schema.ts`
- `services/api/src/modules/tax/application/use-cases/request-tax-eric-job.use-case.ts`
- `services/api/src/modules/tax/application/use-cases/get-tax-eric-job.use-case.ts`
- `services/api/src/modules/tax/tax-filing-reports.controller.ts`

What exists:

- `validate` and `submit` job actions
- queued/running/succeeded/failed job states
- persisted request/response payloads
- artifact references for `xml`, `protocol_pdf`, and `log`
- HTTP endpoints to request and fetch jobs

This is a strong orchestration model and should be kept.

### 4. Payload mapping exists, but it is explicitly stubbed

The current payload mapper is not production-grade:

- `services/api/src/modules/tax/infrastructure/eric/annual-income-eric-payload.mapper.ts`

Current state:

- only `annual_income_report` is mapped
- payload version is `stub-v1`
- target gateway is `elster-gateway`
- code comment explicitly says the payload must be replaced with an ERiC-native payload

This means Kerniflow does not yet produce the real request payloads needed for ELSTER submission.

### 5. Background processing is stubbed, not integrated

The current handler simulates success:

- `services/api/src/modules/background/runtime/modules/tax/handlers/tax-report-eric-job-requested.handler.ts`

Current behavior:

- marks jobs as running
- creates stub artifacts
- marks jobs as succeeded
- stores a stubbed response payload

What it does not do:

- call a real external gateway
- invoke ERiC
- manage certificates
- parse ELSTER transport responses
- store real transfer references or submission receipts

### 6. The repo already documents that ELSTER transport is missing

This is explicitly stated in:

- `services/api/src/modules/tax/infrastructure/eric/README.md`

Current documented decision:

- there is **no native ERiC runtime** in this repo
- ELSTER integration should be isolated behind an external `elster-gateway`
- the preferred target is a **C#/.NET** service hosting ERiC via native interop

This is the correct architectural direction and should remain the baseline plan.

### 7. Submission bookkeeping exists, but it is manual

Submission-related use cases exist:

- `services/api/src/modules/tax/application/use-cases/submit-tax-filing.use-case.ts`
- `services/api/src/modules/tax/application/use-cases/confirm-income-tax-draft-submission.use-case.ts`
- `services/api/src/modules/tax/domain/entities/tax-report.entity.ts`

Current state:

- reports can be marked as submitted
- submission metadata can be stored
- references/notes can be saved

Limitation:

- this is currently **manual submission bookkeeping**, not ELSTER submission.

## What is missing for real ELSTER submission

### Missing capability matrix

| Area                        | Current state                | Missing for production                                                                                  |
| --------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| ELSTER developer onboarding | Not in repo                  | Developer account access, operational process, manufacturer/developer credentials as required by ELSTER |
| ERiC runtime                | Not in repo                  | Real ERiC installation and version management                                                           |
| Gateway transport           | Stub target only             | Real `elster-gateway` service and API contract                                                          |
| Payload generation          | Stub annual-income mapper    | Per-form, per-tax-year ERiC-native payload builders                                                     |
| Certificate management      | Not present                  | Certificate upload, storage, rotation, workspace binding, passphrase handling                           |
| Validation flow             | Job model exists             | Real gateway validation response mapping and surfaced errors                                            |
| Submission flow             | Job model exists             | Real transmission, transfer ticket/reference, protocol artifacts                                        |
| Official response handling  | Not present                  | Persist ERiC result codes, protocol documents, transport receipts                                       |
| Form coverage               | Partial internal reporting   | Exact ELSTER-supported declaration coverage and schemas by year                                         |
| Audit/compliance            | Basic report metadata exists | Submission audit trail, payload hash, ERiC version, certificate identity used                           |
| Testing                     | Internal tests only          | End-to-end tests against gateway and ELSTER-compatible validation pipeline                              |

## Recommended target architecture

### Keep in Node

Kerniflow tax API should remain the **orchestrator**:

- tax data assembly
- report lifecycle
- job creation
- status polling
- artifact persistence
- UI/API for submission workflows

### Move to an external gateway

Implement a dedicated `elster-gateway` service, as already proposed in the repo:

- hosts ERiC
- owns native runtime concerns
- accepts a stable internal request from Kerniflow
- performs `validate` and `submit`
- returns structured results, artifacts, and transmission references

### Why this split is right

- keeps Node services free of native ERiC runtime coupling
- isolates ELSTER-specific release/version churn
- makes declaration-type expansion easier
- matches the current repo decision in `infrastructure/eric/README.md`

## Proposed implementation phases

### Phase 0: Access and compliance groundwork

Before coding the final integration:

1. Register/access the ELSTER developer area.
2. Confirm which declaration types Kerniflow wants to support first.
3. Obtain the official technical assets needed for those forms.
4. Clarify operational requirements for certificates, credentials, and environment setup.

Recommended initial scope:

- DE periodic VAT submission first
- then annual income / income tax flows
- then annual VAT / EÜR only if ELSTER form coverage and product scope are confirmed

### Phase 1: Formalize the internal ELSTER contract

Add a stable internal request/response contract between Node tax and `elster-gateway`.

The contract should include:

- declaration type
- tax year / period
- workspace and report ids
- normalized payload version
- validation vs. submission mode
- certificate reference
- correlation id / job id

Response should include:

- gateway status
- ERiC version
- result codes
- human-readable errors/warnings
- transmission reference / transfer ticket
- protocol artifact references

### Phase 2: Build the real gateway

Create the external service described by the repo scaffold.

Minimum gateway MVP:

- health/version endpoint
- `validate`
- `submit`
- artifact generation/return contract
- structured error model

If the README direction is kept, .NET is the sensible first implementation target.

### Phase 3: Replace the stub background handler

Replace:

- `services/api/src/modules/background/runtime/modules/tax/handlers/tax-report-eric-job-requested.handler.ts`

with logic that:

- loads the persisted job request
- calls `elster-gateway`
- persists actual artifacts and response payloads
- maps gateway outcome to job status
- stores transmission references and validation messages

### Phase 4: Replace stub payload builders with real ones

Start with the narrowest production scope.

Recommended order:

1. periodic VAT (`UStVA`)
2. annual income / income tax submission flow actually chosen by product/legal scope
3. additional DE declarations after live validation is stable

This requires:

- per-form payload mappers
- per-tax-year versioning
- compatibility tests for each supported year

### Phase 5: Add certificate and submission operations

Kerniflow still needs product/infrastructure work for:

- certificate upload and secure storage
- workspace-to-certificate assignment
- passphrase handling
- operator/admin tooling
- submission monitoring and retry rules

This is currently entirely absent from the repo and must be treated as a first-class workstream.

### Phase 6: Harden for production

Before go-live:

- record payload hash and gateway version used for every submission
- retain protocol and log artifacts
- define retry/idempotency policy
- add monitoring and alerting for failed submissions
- add operator dashboards for stuck jobs
- add end-to-end tests for gateway interaction

## Repo-specific implementation recommendations

### 1. Keep the existing ERiC job model

Do not replace the current job entity model. It is already a good fit for async validation/submission.

What to extend:

- richer response payload schema
- explicit validation messages
- explicit transmission metadata
- certificate reference used
- gateway version / ERiC version used

### 2. Separate manual submission from ELSTER submission

Right now, `submitted` can mean either a real transmission or a manual bookkeeping state.

That ambiguity will become a problem.

Recommended change:

- keep current manual path
- add explicit submission channel metadata such as `MANUAL` vs `ELSTER`
- require transfer reference / gateway receipt for `ELSTER`

### 3. Narrow the first supported declaration type

Do not try to ship all DE tax flows through ELSTER at once.

The repo is currently best positioned for:

- periodic VAT first

because:

- it already has export logic
- it is narrower than the annual income wizard
- it is a better fit for the first real gateway integration

### 4. Do not assume the annual income wizard is submission-ready

The annual income assistant is a strong product surface, but it should not be confused with a finished ELSTER declaration pipeline.

Current gaps there include:

- stub payload mapping
- no real validation
- no real transmission
- no official schema/version alignment proven in repo

## Risks and open questions

### Product scope questions

- Which declarations must be submitted through ELSTER first?
- Is the first milestone only validation, or real submission?
- Is EÜR in scope for direct ELSTER submission, PDF export, or both?

### Technical questions

- What exact ELSTER/ERiC assets become available after developer-area onboarding?
- Which ERiC runtime environments are officially supported for the intended deployment model?
- What is the preferred artifact flow: gateway stores artifacts, or Node stores returned binaries/documents?

### Compliance and ops questions

- Who owns ELSTER certificates operationally?
- Are certificates per workspace, per filing agent, or centrally managed?
- What audit retention is required for protocols and logs?

## Recommended next steps

### Immediate

1. Get ELSTER developer-area access.
2. Decide the first declaration type for production integration.
3. Freeze the internal `elster-gateway` request/response contract.

### Short term

1. Implement `elster-gateway` MVP.
2. Replace the stub background handler with a real outbound integration.
3. Add real payload mapping for the first supported declaration type.

### After first live path works

1. Add certificate management UX and secret handling.
2. Add richer audit and operator tooling.
3. Expand declaration coverage one form at a time.

## Bottom line

Kerniflow has already built most of the **application orchestration** needed for ELSTER:

- reports
- jobs
- artifacts
- workflow
- UI surfaces

What it does **not** yet have is the **real ELSTER execution layer**:

- official payloads
- ERiC runtime
- certificate handling
- transport integration
- response/protocol handling

The correct next move is **not** to keep adding more UI around submission. The correct next move is to implement the external `elster-gateway` and wire the existing ERiC job scaffold to it, starting with a single declaration type.

## Sources

Official:

- [ELSTER developer information](https://www.elster.de/eportal/infoseite/entwickler)
- [ELSTER transfer interface information](https://www.elster.de/eportal/infoseite/schnittstellen)

Repo:

- `docs/features/tax-current-state.md`
- `docs/features/tax-roadmap.md`
- `docs/features/tax-income-tax-assistant.md`
- `services/api/src/modules/tax/infrastructure/eric/README.md`
- `services/api/src/modules/tax/infrastructure/eric/annual-income-eric-payload.mapper.ts`
- `services/api/src/modules/tax/application/use-cases/request-tax-eric-job.use-case.ts`
- `services/api/src/modules/background/runtime/modules/tax/handlers/tax-report-eric-job-requested.handler.ts`
- `services/api/src/modules/tax/application/use-cases/export-tax-filing-elster-xml.use-case.ts`
- `services/api/src/modules/tax/application/services/tax-filing-export-eligibility.ts`
