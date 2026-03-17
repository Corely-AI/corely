# Tax ELSTER Architecture

## Scope

This document describes the first production-oriented ELSTER integration slice for the tax module.

Current supported declaration path:

- Germany periodic VAT advance return (`DE UStVA`, internal report type `VAT_ADVANCE`)

Current unsupported live declaration paths:

- annual income tax
- annual VAT return
- payroll tax
- trade tax
- any declaration that requires ERiC-native mapping not yet implemented behind the gateway

## Architecture decision

The Node/Nest tax module remains the orchestrator. Native ERiC runtime concerns are externalized behind an `elster-gateway` boundary.

Corely owns:

- filing lifecycle
- ELSTER job creation
- idempotent request creation
- outbox-driven background execution
- job status persistence
- audit trail
- persisted ELSTER evidence and artifacts
- API/UI-facing reporting state

The external gateway owns:

- ERiC runtime installation and upgrades
- ELSTER protocol transport
- declaration validation/submit execution
- ERiC-native response parsing
- certificate-backed transmission mechanics

## Internal gateway contract

The tax module sends a normalized `TaxElsterGatewayRequest` and receives a normalized `TaxElsterGatewayResult`.

The request includes:

- declaration type
- filing/report identifiers
- job/request/correlation identifiers
- operation (`validate` or `submit`)
- payload version
- certificate reference id
- normalized filing period metadata
- declaration payload body
- audit metadata

The response includes:

- gateway status
- operation and outcome classification
- gateway and ERiC versions when available
- machine-readable result codes
- structured messages
- transfer reference for successful submissions
- artifact payload descriptors
- raw metadata for persistence
- start/finish timestamps

## Job lifecycle

`TaxEricJob` is the current submission-attempt record.

Statuses:

- `queued`
- `running`
- `validation_failed`
- `submission_failed`
- `technical_failed`
- `succeeded`
- `succeeded_with_warnings`

This lets the tax module distinguish:

- report readiness
- ELSTER transport state
- validation failures
- transport/runtime failures
- successful transmission evidence

## Manual vs ELSTER submission

Manual bookkeeping submission remains supported through the existing filing submit endpoint.

That path:

- stores `submissionMethod = manual`
- stores `submissionMeta.channel = manual`
- does not pretend ELSTER transmission occurred

ELSTER submission happens only through the ELSTER job flow.

That path requires:

- a successful gateway result
- a transfer reference for submit operations
- persisted evidence metadata in filing submission state

## Artifact ownership

The gateway may return artifact payloads, but Corely remains the system of record for persisted evidence.

Artifacts returned by the gateway are stored by the background handler into Corely document/file storage and referenced from the `TaxEricJob`.

## Certificate handling

This slice only introduces certificate references.

It does not implement:

- certificate onboarding UX
- private key storage
- vault integration
- secret rotation
- certificate tenancy policy

Those concerns remain deferred to secure platform/gateway infrastructure.

## Operational notes

- The ELSTER worker path is asynchronous and outbox-driven.
- Correlation ids and request ids are carried through request creation, gateway transport, and persistence.
- Idempotency is applied when an idempotency key is available from the caller context.
- The gateway adapter distinguishes technical transport failures from domain validation/submission failures.

## Next phases

1. Deploy and harden the external `elster-gateway`.
2. Add certificate provisioning and secure reference resolution.
3. Add protocol artifact download/retention policy.
4. Add more declaration-specific builders behind the same application port.
5. Add operator tooling for retries, replay review, and support diagnostics.
