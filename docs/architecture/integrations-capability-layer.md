# Integrations Capability Layer

## Goal

The Integrations module provides external provider connectivity without owning domain business state.

- POS cashless providers: SumUp (implemented), Adyen (stub).
- CRM mail providers: Microsoft Graph and Gmail.
- Provider SDK and HTTP clients stay inside Integrations and `packages/integrations/*`.

## Ownership Boundaries

Integrations owns:

- `IntegrationConnection` configuration and secret handling.
- Provider adapter selection and provider-specific request/response mapping.
- Webhook verification/normalization.

Integrations does not own:

- POS payment attempt state machine or payment business status.
- CRM mailbox/thread/message business entities.

Business modules own their own tables and state transitions:

- POS module owns `PaymentAttempt`.
- CRM mail module owns `CrmMailbox`, `CrmMailThread`, `CrmMailMessage`.

## Explicit Cross-Module Ports

Corely boundary rules prefer contracts/events first. For these synchronous API-first flows, explicit ports are used:

- `CashlessGatewayPort`:
  POS use-cases call Integrations to create/get/cancel provider sessions.
- `CashlessPaymentUpdatePort`:
  Integrations webhook controller calls POS update service to mutate `PaymentAttempt`.
  Integrations never writes POS tables directly.
- `EmailSendPort` and `EmailInboxPort`:
  CRM mail use-cases call Integrations adapters for send/sync.
  Integrations never writes CRM tables directly.

These explicit ports are limited to capability surfaces and keep table ownership inside business modules.

## POS Cashless Flow

1. POS starts payment: `POST /pos/payments/cashless/start`.
2. POS module creates `PaymentAttempt` with idempotency key.
3. POS calls `CashlessGatewayPort` to create provider session.
4. API returns normalized action (`redirect_url`, `qr_payload`, `terminal_action`, `none`).
5. Webhook or polling updates status.
6. Integrations webhook calls `CashlessPaymentUpdatePort`, POS updates state machine.

## CRM Mail Flow

1. CRM creates mailbox linked to an `IntegrationConnection`.
2. Send flow calls `EmailSendPort`.
3. Sync flow calls `EmailInboxPort`.
4. Integrations normalizes provider payloads to `NormalizedEmailMessage`.
5. CRM persists normalized mailbox/thread/message state and cursors.

Current receive mode is polling-based sync; webhook endpoints are scaffolded for incremental adoption.

## Adding a New Provider (Example: Adyen)

1. Create/extend package in `packages/integrations/<provider>`.
2. Implement capability interface only (cashless and/or mail), no Nest/Prisma imports.
3. Register provider in `IntegrationProviderRegistryService`.
4. Add integration kind/contracts in `packages/contracts`.
5. Add connection test logic in Integrations use-cases/controllers.
6. Reuse existing POS/CRM ports; do not change business table ownership.
7. Add unit mapping tests and webhook/sync integration tests.
