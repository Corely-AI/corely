# Audit 01: Size & Complexity Hotspots

## Top Risk: "God Objects"

These files violate single-responsibility principles by aggregating too much logic or configuration.

| Path                                                       | LOC      | Risk                                                                                                               | Split Plan                                                                                         |
| ---------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `services/api/src/modules/inventory/inventory.module.ts`   | **1103** | **Critical**. Framework config file shouldn't be this huge. Likely contains inline providers or excessive imports. | Split into sub-modules (e.g., `StockModule`, `ProductModule`) or move providers to `providers.ts`. |
| `services/api/src/modules/purchasing/purchasing.module.ts` | **870**  | **Severe**. Same as above.                                                                                         | Extract sub-modules or move mixed provider logic out.                                              |
| `services/api/src/modules/sales/sales.module.ts`           | **787**  | **Severe**. Same as above.                                                                                         | Extract `QuotesModule`, `OrdersModule` if they are grouped here.                                   |

## Frontend Monoliths (React/TSX)

UI components that do too much (presentation + logic + data fetching).

| Path                                                          | LOC     | Risk                                                           | Split Plan                                                                                             |
| ------------------------------------------------------------- | ------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `apps/web/src/modules/invoices/screens/NewInvoicePage.tsx`    | **955** | **Critical**. Unmaintainable. Too complex for a single screen. | Extract `InvoiceForm`, `LineItemsTable`, `ClientSelector`. Move form state to `useInvoiceForm`.        |
| `apps/web/src/modules/invoices/screens/InvoiceDetailPage.tsx` | **872** | **Severe**.                                                    | Extract `InvoiceViewer`, `InvoiceActions`, `PaymentHistory`.                                           |
| `apps/web/src/shared/ui/sidebar.tsx`                          | **734** | **High**. Navigation logic mixed with UI?                      | Extract menu config to `navigation.config.ts`. Create purely presentational `SidebarGroup` components. |
| `apps/web/src/shared/components/QuestionForm.tsx`             | **679** | **High**. Reusable component is too big.                       | Break into `QuestionField`, `StepWizard`, `ValidationSummary`.                                         |
| `apps/web/src/modules/sales/screens/SalesCopilotPage.tsx`     | **659** | **High**. Chat + business logic mix.                           | Extract `ChatInterface`, `CopilotSuggestions`, `ContextPanel`.                                         |

## Backend Logic Dumpsters

files named `*.usecases.ts` that likely contain _many_ classes instead of one per file.

| Path                                                                                 | LOC     | Risk                                     | Split Plan                                                                                                |
| ------------------------------------------------------------------------------------ | ------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `services/api/src/modules/inventory/application/use-cases/documents.usecases.ts`     | **917** | **Critical**. "Utils" bag for biz logic. | **Enforce 1 use-case per file**. Split into `CreateInventoryDocumentUseCase`, `ReceiveItemsUseCase`, etc. |
| `services/api/src/modules/accounting/application/use-cases/accounting.usecases.ts`   | **669** | **Severe**.                              | Split into `PostJournalEntryUseCase`, `GetAccountBalanceUseCase`, etc.                                    |
| `services/api/src/modules/sales/application/use-cases/quotes.usecases.ts`            | **606** | **High**.                                | Split into `CreateQuoteUseCase`, `ConvertQuoteToOrderUseCase`.                                            |
| `services/api/src/modules/invoices/domain/invoice-capabilities.builder.ts`           | **547** | **High**. Domain logic complexity.       | Use Strategy pattern or split into smaller builders/validators.                                           |
| `services/api/src/modules/purchasing/application/use-cases/vendor-bills.usecases.ts` | **539** | **High**.                                | Split per action: `ApproveBill`, `PayBill`, `CreateBill`.                                                 |

## Summary

The codebase suffers from **file-based grouping** (e.g., `accounting.usecases.ts`) rather than **class-based separation**. This makes files grow indefinitely. Frontend pages are monoliths that need component decomposition.
