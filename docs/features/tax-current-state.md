# Tax Module — Current State

> Last updated: 2026-03-03 | API version: Kerniflow monorepo

---

## Overview

The Tax module (`services/api/src/modules/tax`) provides multi-jurisdiction tax calculation,
VAT period management, filing lifecycle, and compliance reporting for Corely workspaces.
It currently supports **Germany (DE)** as the primary jurisdiction.

Related:

- [Tax Income Date Basis and Payment Invariant](./tax-income-date-basis.md)

---

## Module Layout

```
modules/tax/
├── tax.controller.ts               HTTP: VAT periods, codes, summary, reports, snapshots
├── tax-filings.controller.ts       HTTP: Filing lifecycle + payments + capabilities
├── tax.module.ts                   NestJS DI wiring
├── tax-http.utils.ts               buildTaxUseCaseContext, unwrap helper
│
├── application/
│   ├── ports/
│   │   └── workspace-tax-settings.port.ts
│   ├── services/
│   │   ├── tax-engine.service.ts   ← Uses JurisdictionPackRegistryPort
│   │   ├── tax-strategy.ts         ← TaxComputationStrategy interface + capabilities
│   │   ├── personal-tax-strategy.ts
│   │   ├── company-tax-strategy.ts ← DE VAT-only COMPANY strategy
│   │   ├── tax-strategy-resolver.service.ts
│   │   ├── tax-capabilities.service.ts  ← Layered: env + strategy capabilities
│   │   ├── rounding.policy.ts
│   │   └── generate-tax-reports.use-case.ts
│   └── use-cases/                  ← 40+ use-case files
│
├── domain/
│   ├── entities/
│   │   ├── tax-filing-status.ts    ← State machine (DRAFT→SUBMITTED→PAID→ARCHIVED)
│   │   └── ...
│   ├── ports/
│   │   ├── jurisdiction-pack.port.ts        ← JurisdictionPack interface
│   │   ├── jurisdiction-pack-registry.port.ts ← JurisdictionPackRegistryPort + InMemory impl
│   │   ├── payment-provider.port.ts         ← PaymentProviderPort
│   │   └── ...existing ports...
│   ├── policies/
│   │   └── rounding.policy.ts      ← Re-exports from application/services
│   ├── reporting/
│   │   ├── report-registry.ts
│   │   └── strategies/de/          ← VatAdvance, EuSalesList, IncomeTax
│   └── services/
│       └── vat-period.resolver.ts
│
└── infrastructure/
    ├── packs/
    │   └── de/v1/
    │       └── de-pack-v1.adapter.ts  ← packId: "de-v1", JurisdictionPack impl
    ├── payments/
    │   └── noop-payment-provider.adapter.ts
    └── prisma/
        └── ...10 repo adapters...
```

---

## Error Handling

All tax-specific errors extend `AppError` from `@corely/domain` with stable `Tax:*` codes:

| Error Class                       | Code                          | HTTP |
| --------------------------------- | ----------------------------- | ---- |
| `TaxProfileMissingError`          | `Tax:ProfileMissing`          | 422  |
| `TaxFilingInvalidTransitionError` | `Tax:FilingInvalidTransition` | 422  |
| `TaxFilingNotDeletableError`      | `Tax:FilingNotDeletable`      | 422  |
| `TaxCapabilityDisabledError`      | `Tax:CapabilityDisabled`      | 403  |
| `TaxJurisdictionUnsupportedError` | `Tax:JurisdictionUnsupported` | 422  |
| `TaxFilingNotFoundError`          | `Tax:FilingNotFound`          | 404  |
| `TaxFilingConflictError`          | `Tax:FilingConflict`          | 409  |

All errors are caught by `ProblemDetailsExceptionFilter` and serialized as RFC7807 JSON.

---

## Filing Lifecycle

```
DRAFT ──────────────────────────────► READY_FOR_REVIEW
  │                                          │
  │         ┌──────────────────────────────┐ │
  │         │                            ▼ ▼ ▼
  └────────► NEEDS_FIX ─────────────► SUBMITTED ──────► PAID
                                          │                │
                                          └────────────────┴──► ARCHIVED
```

**Allowed transitions** (from → to):

- `DRAFT` → `NEEDS_FIX | READY_FOR_REVIEW | SUBMITTED | ARCHIVED`
- `NEEDS_FIX` → `DRAFT | READY_FOR_REVIEW | ARCHIVED`
- `READY_FOR_REVIEW` → `DRAFT | NEEDS_FIX | SUBMITTED | ARCHIVED`
- `SUBMITTED` → `PAID | ARCHIVED`
- `PAID` → `ARCHIVED`
- `ARCHIVED` → (terminal)

**Deletable statuses**: `DRAFT`, `NEEDS_FIX`

Transition enforcement: `assertFilingTransition(from, to, filingId)` — throws `TaxFilingInvalidTransitionError` for any disallowed transition.

---

## Jurisdiction Packs

| Pack ID | Jurisdiction | Status        |
| ------- | ------------ | ------------- |
| `de-v1` | Germany (DE) | ✅ Production |
| `at-v1` | Austria (AT) | 🔮 Planned    |
| `fr-v1` | France (FR)  | 🔮 Planned    |

**Registry**: `InMemoryJurisdictionPackRegistry` — packs registered at TaxModule startup.

**Reproducibility**: Every `TaxSnapshot` now stores `packId` to enable exact recalculation with the same pack version.

---

## Capabilities System

Capabilities are layered:

1. **Global kill-switch**: `TAX_PAYMENTS_ENABLED` env var (default: `true`)
2. **Strategy capabilities**: Per-strategy (PERSONAL vs COMPANY) flags

```json
{
  "paymentsEnabled": true,
  "strategy": {
    "canFileVat": true,
    "canPayVat": true,
    "needsConsultant": false,
    "supportsReverseCharge": true,
    "supportsOss": false
  }
}
```

---

## Domain Events

Tax filing lifecycle events are emitted via `OutboxPort` (`kernel/outbox-port`):

| Event                   | Trigger                       |
| ----------------------- | ----------------------------- |
| `TaxFilingSubmitted`    | `SubmitTaxFilingUseCase`      |
| `TaxFilingPaid`         | `MarkTaxFilingPaidUseCase`    |
| `TaxFilingRecalculated` | `RecalculateTaxFilingUseCase` |

Events are also written to the `TaxFilingEvent` table in the DB for local audit/replay.

---

## Idempotency

Mutating endpoints are protected by `IdempotencyInterceptor` at the controller level.
Clients must send `Idempotency-Key: <uuid>` on POST requests.
Duplicate keys replay the stored response without re-executing the use case.

---

## Prisma Schema (`62_tax.prisma`)

Key models:

| Model              | Purpose                                                          |
| ------------------ | ---------------------------------------------------------------- |
| `TaxProfile`       | Tenant tax configuration (regime, VAT ID, frequency)             |
| `TaxCode`          | Tax code classifications (STANDARD, REDUCED, EXEMPT…)            |
| `TaxRate`          | Effective-dated rates (in basis points)                          |
| `TaxSnapshot`      | Immutable calculation for finalized documents                    |
| `TaxReport`        | Filing obligation (scheduled) record                             |
| `TaxReportLine`    | Per-line detail for ESL/Intrastat reports                        |
| `TaxDocumentLink`  | Links tax filings to Documents module (Tax does not own storage) |
| `TaxFilingEvent`   | Domain event log for filing lifecycle                            |
| `VatPeriodSummary` | Aggregated VAT totals for reporting periods                      |

---

## Supported Endpoints

### Tax Controller (`/tax`)

| Method | Path                           | Use Case               |
| ------ | ------------------------------ | ---------------------- |
| GET    | `/tax/profile`                 | GetTaxProfile          |
| POST   | `/tax/profile`                 | UpsertTaxProfile       |
| GET    | `/tax/codes`                   | ListTaxCodes           |
| POST   | `/tax/codes`                   | CreateTaxCode          |
| POST   | `/tax/calculate`               | CalculateTax           |
| GET    | `/tax/summary`                 | GetTaxSummary          |
| GET    | `/tax/reports`                 | ListTaxReports         |
| GET    | `/tax/reports/:id`             | GetTaxReport           |
| POST   | `/tax/reports/:id/submit`      | MarkTaxReportSubmitted |
| GET    | `/tax/vat-periods`             | ListVatPeriods         |
| GET    | `/tax/vat-periods/:id/summary` | GetVatPeriodSummary    |
| GET    | `/tax/consultant`              | GetTaxConsultant       |
| POST   | `/tax/consultant`              | UpsertTaxConsultant    |

### Tax Filings Controller (`/tax/filings`)

| Method | Path                           | Use Case             |
| ------ | ------------------------------ | -------------------- |
| GET    | `/tax/filings`                 | ListTaxFilings       |
| POST   | `/tax/filings`                 | CreateTaxFiling      |
| GET    | `/tax/filings/:id`             | GetTaxFilingDetail   |
| DELETE | `/tax/filings/:id`             | DeleteTaxFiling      |
| POST   | `/tax/filings/:id/submit`      | SubmitTaxFiling      |
| POST   | `/tax/filings/:id/mark-paid`   | MarkTaxFilingPaid    |
| POST   | `/tax/filings/:id/recalculate` | RecalculateTaxFiling |
| GET    | `/tax/capabilities`            | GetTaxCapabilities   |
| GET    | `/tax/payments`                | ListTaxPayments      |
