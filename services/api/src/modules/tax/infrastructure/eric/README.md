# ELSTER Gateway Integration

## Decision

Corely currently has no native ERiC runtime or direct ELSTER transport integration in this repo.
To keep the tax module extensible and avoid coupling Node.js processes to native ERiC binaries, ERiC integration is isolated behind an external `elster-gateway` service boundary.

Default target for the gateway is a C#/.NET service that can host ERiC via native interop (`P/Invoke`) and expose a stable HTTP/gRPC contract to Corely.

## Why isolate ERiC

- Native dependency isolation: ERiC versions and native libraries are managed in one place.
- Operational safety: Node API containers remain free of platform-specific ERiC runtime constraints.
- Extensibility: additional declaration/report types can reuse the same gateway contract.
- Upgrade control: ERiC version rollouts are decoupled from API deploy cadence.

## Current implementation in this repo

- The tax module builds a normalized `TaxElsterGatewayRequest` through an application-layer submission builder port.
- `HttpTaxElsterGatewayAdapter` encapsulates outbound transport to the external `elster-gateway`.
- API creates ELSTER jobs (`validate`/`submit`) and enqueues background processing.
- The background runtime calls the external gateway, maps outcomes into tax job states, and stores artifact document references (`xml`, `protocol_pdf`, `log`) using the Documents persistence model.
- The tax module persists ELSTER evidence separately from manual bookkeeping submission metadata.

## Current supported declaration scope

- Supported live path: German periodic VAT advance returns (`DE UStVA` / `VAT_ADVANCE`) only.
- Unsupported for live ELSTER transport in this repo slice: annual income tax and other declaration families.

## Deliberately deferred

- Native ERiC runtime hosting and version operations remain external to Node.
- Certificate onboarding, secret custody, and rotation remain gateway/platform concerns.
- Additional ELSTER form mappings remain future work and should be added behind the same gateway contract, not by coupling the tax module to ERiC-native payloads.
