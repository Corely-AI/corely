### Inventory Note

**Existing Architecture:**

- **Backend**: `services/api/src/modules/tax` contains "Calculation" logic (`DEPackV1`) and some report models.
- **Contracts**: `packages/contracts/src/tax` defines `TaxReportDto` and `VatPeriodSummaryDto`, but `TaxReportType` enum is limited (`VAT_ADVANCE`, `VAT_ANNUAL`, `INCOME_TAX`).
- **Database**: `TaxReport` model exists in `packages/data/prisma/schema/62_tax.prisma` with matching limited Enums.
- **Frontend**: `apps/web/src/modules/tax/screens/TaxReportsPage.tsx` exists.

**Plan to Implement:**

1.  **Contracts & Schema**:
    - Extend `TaxReportType` with: `EU_SALES_LIST`, `INTRASTAT`, `PAYROLL_TAX`, `PROFIT_LOSS`, `BALANCE_SHEET`, `TRADE_TAX`, etc.
    - Extend `TaxReportGroup` with `COMPLIANCE`.
2.  **Backend**:
    - Implement **Report Registry** pattern in `services/api/src/modules/tax/domain/reporting`.
    - Implement/Extend `GenerateTaxReportsUseCase` to support all types.
    - Implement DE-specific rules for deadlines and logic (ESL, Intrastat, etc.).
3.  **Frontend**:
    - Update `TaxReportsPage` to handle new types.
    - Create generic `TaxReportDetailPage` with specific sections based on report type.
4.  **Worker**:
    - Ensure `auto-generate` jobs cover the new types.
