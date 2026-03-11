# Income Tax Return Section Model

## Overview

The income-tax-return wizard now persists through `TaxReportSection` records instead of relying on a single legacy `annualIncome` payload plus long-lived React-only state.

This keeps the tax module aligned with the existing report-section storage boundary while letting the frontend autosave each wizard area independently.

## Persisted Sections

The income-tax-return flow now uses these section keys:

- `personalDetails`
- `income`
- `healthInsurance`
- `otherInsurances`
- `additionalExpenses`
- `taxOfficeInfo`
- `payslips`
- `children`

Each section has its own shared schema in:

- [/Users/hadoan/Documents/GitHub/Kerniflow/packages/contracts/src/tax/income-tax-return-sections.schema.ts](/Users/hadoan/Documents/GitHub/Kerniflow/packages/contracts/src/tax/income-tax-return-sections.schema.ts)
- [/Users/hadoan/Documents/GitHub/Kerniflow/packages/contracts/src/tax/tax-report-sections.schema.ts](/Users/hadoan/Documents/GitHub/Kerniflow/packages/contracts/src/tax/tax-report-sections.schema.ts)

## Backend Flow

The backend still uses `TaxReportSection` as the persistence boundary.

Read/write orchestration is handled by:

- [/Users/hadoan/Documents/GitHub/Kerniflow/services/api/src/modules/tax/application/use-cases/get-tax-report-section.use-case.ts](/Users/hadoan/Documents/GitHub/Kerniflow/services/api/src/modules/tax/application/use-cases/get-tax-report-section.use-case.ts)
- [/Users/hadoan/Documents/GitHub/Kerniflow/services/api/src/modules/tax/application/use-cases/list-tax-report-sections.use-case.ts](/Users/hadoan/Documents/GitHub/Kerniflow/services/api/src/modules/tax/application/use-cases/list-tax-report-sections.use-case.ts)
- [/Users/hadoan/Documents/GitHub/Kerniflow/services/api/src/modules/tax/application/use-cases/upsert-tax-report-section.use-case.ts](/Users/hadoan/Documents/GitHub/Kerniflow/services/api/src/modules/tax/application/use-cases/upsert-tax-report-section.use-case.ts)

Persistence remains in:

- [/Users/hadoan/Documents/GitHub/Kerniflow/services/api/src/modules/tax/infrastructure/prisma/prisma-tax-report-section-repo.adapter.ts](/Users/hadoan/Documents/GitHub/Kerniflow/services/api/src/modules/tax/infrastructure/prisma/prisma-tax-report-section-repo.adapter.ts)

HTTP endpoints are exposed from:

- [/Users/hadoan/Documents/GitHub/Kerniflow/services/api/src/modules/tax/tax-filing-reports.controller.ts](/Users/hadoan/Documents/GitHub/Kerniflow/services/api/src/modules/tax/tax-filing-reports.controller.ts)

The section API is:

- `GET /tax/filings/:filingId/reports/:reportId/sections`
- `GET /tax/filings/:filingId/reports/:reportId/sections/:sectionKey`
- `PUT /tax/filings/:filingId/reports/:reportId/sections/:sectionKey`

## Frontend Flow

The wizard now loads and autosaves section data through:

- [/Users/hadoan/Documents/GitHub/Kerniflow/packages/web-features/src/modules/tax/hooks/useTaxReportSection.ts](/Users/hadoan/Documents/GitHub/Kerniflow/packages/web-features/src/modules/tax/hooks/useTaxReportSection.ts)

The main filing page wires one section hook per wizard area:

- [/Users/hadoan/Documents/GitHub/Kerniflow/packages/web-features/src/modules/tax/screens/income-tax-return-page.tsx](/Users/hadoan/Documents/GitHub/Kerniflow/packages/web-features/src/modules/tax/screens/income-tax-return-page.tsx)

The dedicated routes also write into report sections:

- payslips: [/Users/hadoan/Documents/GitHub/Kerniflow/packages/web-features/src/modules/tax/screens/income-statement-payslip-page.tsx](/Users/hadoan/Documents/GitHub/Kerniflow/packages/web-features/src/modules/tax/screens/income-statement-payslip-page.tsx)
- children: [/Users/hadoan/Documents/GitHub/Kerniflow/packages/web-features/src/modules/tax/screens/income-statement-child-page.tsx](/Users/hadoan/Documents/GitHub/Kerniflow/packages/web-features/src/modules/tax/screens/income-statement-child-page.tsx)

## Legacy `annualIncome` Compatibility

The old `annualIncome` section is still supported for compatibility.

Current coexistence rules:

- new wizard UI reads the new `income` section
- if `income` is missing, the backend hydrates `income.annualIncome` from legacy `annualIncome`
- when the new `income` section is written, its nested `annualIncome` payload is mirrored back to the legacy `annualIncome` section

This keeps existing reports readable without turning `annualIncome` into the storage model for the entire wizard.

## Current Scope

Implemented in this slice:

- backend contracts for all major income-tax-return sections
- generic section read/write/list endpoints
- frontend autosave-backed wizard tabs
- persisted `payslips` section
- persisted `children` section

Still future work:

- richer completion rules per section
- editing an existing child from a dedicated child-id route
- review-and-submit aggregation across all income-tax-return sections
- payload normalization for actual income-tax ELSTER submission
