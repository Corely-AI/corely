# ERiC Gateway Integration (Scaffold)

## Decision

Corely currently has no native ERiC runtime or direct ELSTER transport integration in this repo.
To keep the tax module extensible and avoid coupling Node.js processes to native ERiC binaries, ERiC integration is isolated behind an external `elster-gateway` service boundary.

Default target for the gateway is a C#/.NET service that can host ERiC via native interop (`P/Invoke`) and expose a stable HTTP/gRPC contract to Corely.

## Why isolate ERiC

- Native dependency isolation: ERiC versions and native libraries are managed in one place.
- Operational safety: Node API containers remain free of platform-specific ERiC runtime constraints.
- Extensibility: additional declaration/report types can reuse the same gateway contract.
- Upgrade control: ERiC version rollouts are decoupled from API deploy cadence.

## Current scaffold in this repo

- `EricPayloadMapperPort` defines `mapReportToEricPayload(reportSnapshot) -> EricRequest`.
- `AnnualIncomeEricPayloadMapper` implements only `annual_income_report` mapping (stub payload).
- API creates ERiC jobs (`validate`/`submit`) and enqueues background processing.
- The background runtime executes a real job lifecycle and stores artifact document references (`xml`, `protocol_pdf`, `log`) using the Documents persistence model.

## Next implementation step

Replace the stub background behavior with an outbound call to `elster-gateway`, keep job and artifact persistence unchanged.
