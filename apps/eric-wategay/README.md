# ERiC Wategay

`apps/eric-wategay` is a dedicated .NET 10 gateway for ELSTER/ERiC operations.
It isolates native ERiC runtime concerns from Corely Node services and exposes a stable HTTP contract the tax worker can call.

## Why isolated gateway

- Native ERiC C libraries are platform-specific and version-sensitive.
- Worker/API containers stay clean and portable (no native ERiC coupling).
- ERiC runtime upgrades can be managed independently from Corely API/worker releases.

## HTTP API

Base path: `/v1`

- `GET /v1/health`
- `GET /v1/ready`
- `POST /v1/eric/validate`
- `POST /v1/eric/submit`

OpenAPI + Swagger UI are exposed in development mode.

## Contract (worker -> gateway)

The JSON shape mirrors shared TS contracts from `packages/contracts/src/tax/eric-gateway.schema.ts`.

Request (`EricRequest`):

- `requestId`, `reportId`, `reportType`, `taxYear`, `mode`
- `payload` (object) or `xml` (string)
- `credentials` (`certificatePfxOrP12BytesBase64` or `certificateDocumentRef`, optional password)
- `options` (`generateProtocolPdf`, `returnXml`, `returnLog`)

Response (`EricResult`):

- `requestId`, `outcome`, `messages[]`, `timings`, `retryable`
- optional `ericVersion`, `schemaVersion`, `datenartVersion`
- optional `artifacts` (`xmlBase64`, `protocolPdfBase64`, `logTextBase64`/`logText`)

## Runtime modes

- `StubEricRuntime` (default when no `ERIC_LIB_PATH` is configured):
  - returns `runtime_error` unless `ERIC_STUB_SUCCESS=true`
  - with `ERIC_STUB_SUCCESS=true`, returns mock successful responses/artifacts
- `NativeEricRuntime` (scaffold):
  - loads native library from `ERIC_LIB_PATH`
  - creates per-request work dir `${ERIC_WORKDIR}/{requestId}/`
  - P/Invoke boundary is scaffolded; full ERiC calls are TODO

## Configuration

- `ASPNETCORE_URLS` (default `http://0.0.0.0:8088`)
- `ERIC_LIB_PATH`
- `ERIC_WORKDIR` (default `/tmp/eric`)
- `ERIC_MODE_DEFAULT` (`test|prod`)
- `ERIC_HERSTELLER_ID` (optional currently)
- `ERIC_STUB_SUCCESS` (`true|false`)
- `MAX_PAYLOAD_BYTES` (default `1048576`)
- `ERIC_MAX_CONCURRENT_CALLS` (default `4`)
- `ERIC_RUNTIME_TIMEOUT_MS` (default `30000`)

## Local run

```bash
DOTNET_ROOT=/path/to/dotnet10 \
/path/to/dotnet10/dotnet run --project apps/eric-wategay/src/EricWategay.Api
```

Stub success mode:

```bash
ERIC_STUB_SUCCESS=true ASPNETCORE_URLS=http://0.0.0.0:8088 \
DOTNET_ROOT=/path/to/dotnet10 /path/to/dotnet10/dotnet run \
  --project apps/eric-wategay/src/EricWategay.Api
```

## Docker

Build and run:

```bash
docker build -f apps/eric-wategay/Dockerfile -t corely-eric-wategay .
docker run --rm -p 8088:8088 -e ERIC_STUB_SUCCESS=true corely-eric-wategay
```

Compose snippet: `apps/eric-wategay/docker-compose.eric-wategay.yml`

## Integration notes for Corely worker

- Configure worker with `ERIC_GATEWAY_URL` (example: `http://localhost:8088/v1`).
- Worker sends `EricRequest` and expects `EricResult`.
- When `EricResult.artifacts` contains base64 values, worker should:
  1. decode bytes
  2. upload via existing Documents/ObjectStorage flow
  3. persist resulting document refs to current `TaxEricJob.artifacts`
- Existing Corely job state transitions and artifact persistence remain unchanged.

## Security + observability

- JSON structured logs include `requestId`, `reportId`, `reportType`.
- `X-Request-Id` is accepted and echoed in response (generated if absent).
- Secrets are redacted from logs (certificate password/bytes and full XML are never logged).
- Error responses use ProblemDetails for `400`, `413`, `429`, `500`, `503`, `504`.
