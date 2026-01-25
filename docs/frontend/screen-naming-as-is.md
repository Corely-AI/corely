# Screen Naming — As Is (Web)

Inventory of route-level screens under `apps/web/src/modules/*/screens` wired in `apps/web/src/app/router/index.tsx`.

| module     | file path                                              | component               | route path(s)                       | type                 |
| ---------- | ------------------------------------------------------ | ----------------------- | ----------------------------------- | -------------------- |
| core       | modules/core/screens/DashboardPage.tsx                 | DashboardPage           | /dashboard                          | Other (home)         |
| assistant  | modules/assistant/screens/AssistantPage.tsx            | AssistantPage           | /assistant                          | Other                |
| expenses   | modules/expenses/screens/ExpensesPage.tsx              | ExpensesPage            | /expenses                           | List                 |
| expenses   | modules/expenses/screens/NewExpensePage.tsx            | NewExpensePage          | /expenses/new, /expenses/:id/edit   | Create/Edit (shared) |
| expenses   | modules/expenses/screens/ExpenseDetailPage.tsx         | ExpenseDetailPage       | /expenses/:id                       | Detail               |
| invoices   | modules/invoices/screens/InvoicesPage.tsx              | InvoicesPage            | /invoices                           | List                 |
| invoices   | modules/invoices/screens/NewInvoicePage.tsx            | NewInvoicePage          | /invoices/new                       | Create               |
| invoices   | modules/invoices/screens/InvoiceDetailPage.tsx         | InvoiceDetailPage       | /invoices/:id                       | Detail/Edit (inline) |
| customers  | modules/customers/screens/CustomersPage.tsx            | CustomersPage           | /customers                          | List                 |
| customers  | modules/customers/screens/NewCustomerPage.tsx          | NewCustomerPage         | /customers/new                      | Create               |
| customers  | modules/customers/screens/EditCustomerPage.tsx         | EditCustomerPage        | /customers/:id                      | Detail/Edit          |
| crm        | modules/crm/screens/DealsPage.tsx                      | DealsPage               | /crm/deals                          | List                 |
| crm        | modules/crm/screens/NewDealPage.tsx                    | NewDealPage             | /crm/deals/new                      | Create               |
| crm        | modules/crm/screens/DealDetailPage.tsx                 | DealDetailPage          | /crm/deals/:id                      | Detail/Edit          |
| crm        | modules/crm/screens/ActivitiesPage.tsx                 | ActivitiesPage          | /crm/activities                     | List                 |
| crm        | modules/crm/screens/NewActivityPage.tsx                | NewActivityPage         | /crm/activities/new                 | Create               |
| sales      | modules/sales/screens/QuotesPage.tsx                   | QuotesPage              | /sales/quotes                       | List                 |
| sales      | modules/sales/screens/NewQuotePage.tsx                 | NewQuotePage            | /sales/quotes/new                   | Create               |
| sales      | modules/sales/screens/QuoteDetailPage.tsx              | QuoteDetailPage         | /sales/quotes/:quoteId              | Detail/Edit          |
| sales      | modules/sales/screens/OrdersPage.tsx                   | OrdersPage              | /sales/orders                       | List                 |
| sales      | modules/sales/screens/NewOrderPage.tsx                 | NewOrderPage            | /sales/orders/new                   | Create               |
| sales      | modules/sales/screens/OrderDetailPage.tsx              | OrderDetailPage         | /sales/orders/:orderId              | Detail/Edit          |
| sales      | modules/sales/screens/InvoicesPage.tsx                 | SalesInvoicesPage       | /sales/invoices                     | List                 |
| sales      | modules/sales/screens/NewInvoicePage.tsx               | SalesNewInvoicePage     | /sales/invoices/new                 | Create               |
| sales      | modules/sales/screens/InvoiceDetailPage.tsx            | SalesInvoiceDetailPage  | /sales/invoices/:invoiceId          | Detail/Edit          |
| sales      | modules/sales/screens/SalesSettingsPage.tsx            | SalesSettingsPage       | /sales/settings                     | Other                |
| sales      | modules/sales/screens/SalesCopilotPage.tsx             | SalesCopilotPage        | /sales/copilot                      | Other                |
| purchasing | modules/purchasing/screens/PurchaseOrdersPage.tsx      | PurchaseOrdersPage      | /purchasing/purchase-orders         | List                 |
| purchasing | modules/purchasing/screens/NewPurchaseOrderPage.tsx    | NewPurchaseOrderPage    | /purchasing/purchase-orders/new     | Create               |
| purchasing | modules/purchasing/screens/PurchaseOrderDetailPage.tsx | PurchaseOrderDetailPage | /purchasing/purchase-orders/:id     | Detail/Edit          |
| purchasing | modules/purchasing/screens/VendorBillsPage.tsx         | VendorBillsPage         | /purchasing/vendor-bills            | List                 |
| purchasing | modules/purchasing/screens/NewVendorBillPage.tsx       | NewVendorBillPage       | /purchasing/vendor-bills/new        | Create               |
| purchasing | modules/purchasing/screens/VendorBillDetailPage.tsx    | VendorBillDetailPage    | /purchasing/vendor-bills/:id        | Detail/Edit          |
| purchasing | modules/purchasing/screens/RecordBillPaymentPage.tsx   | RecordBillPaymentPage   | /purchasing/vendor-bills/:id/pay    | Other                |
| purchasing | modules/purchasing/screens/PurchasingSettingsPage.tsx  | PurchasingSettingsPage  | /purchasing/settings                | Other                |
| purchasing | modules/purchasing/screens/PurchasingCopilotPage.tsx   | PurchasingCopilotPage   | /purchasing/copilot                 | Other                |
| inventory  | modules/inventory/screens/ProductsPage.tsx             | ProductsPage            | /inventory/products                 | List                 |
| inventory  | modules/inventory/screens/ProductDetailPage.tsx        | ProductDetailPage       | /inventory/products/:id             | Detail/Edit          |
| inventory  | modules/inventory/screens/WarehousesPage.tsx           | WarehousesPage          | /inventory/warehouses               | List                 |
| inventory  | modules/inventory/screens/DocumentsPage.tsx            | DocumentsPage           | /inventory/documents                | List                 |
| inventory  | modules/inventory/screens/DocumentDetailPage.tsx       | DocumentDetailPage      | /inventory/documents/:id            | Detail/Edit          |
| inventory  | modules/inventory/screens/StockOverviewPage.tsx        | StockOverviewPage       | /inventory/stock                    | Other                |
| inventory  | modules/inventory/screens/ReorderDashboardPage.tsx     | ReorderDashboardPage    | /inventory/reorder                  | Other                |
| inventory  | modules/inventory/screens/InventoryCopilotPage.tsx     | InventoryCopilotPage    | /inventory/copilot                  | Other                |
| platform   | modules/platform/screens/PlatformPage.tsx              | PlatformPage            | /settings/platform                  | Other                |
| platform   | modules/platform/screens/AppsManagementPage.tsx        | AppsManagementPage      | /settings/platform/apps             | Other                |
| platform   | modules/platform/screens/TemplatesPage.tsx             | TemplatesPage           | /settings/platform/templates        | Other                |
| platform   | modules/platform/screens/MenuCustomizerPage.tsx        | MenuCustomizerPage      | /settings/platform/menu             | Other                |
| tax        | modules/tax/screens/TaxesOverviewPage.tsx              | TaxesOverviewPage       | /taxes                              | List                 |
| tax        | modules/tax/screens/TaxReportsPage.tsx                 | TaxReportsPage          | /tax/reports                        | Other                |
| tax        | modules/tax/screens/TaxSettingsPage.tsx                | TaxSettingsPage         | /tax/settings and /settings/tax     | Other                |
| settings   | modules/settings/screens/SettingsPage.tsx              | SettingsPage            | /settings                           | Other                |
| settings   | modules/settings/screens/RolesPage.tsx                 | RolesPage               | /settings/roles                     | Other                |
| settings   | modules/settings/screens/RolePermissionsPage.tsx       | RolePermissionsPage     | /settings/roles/:roleId/permissions | Other                |
| workspaces | modules/workspaces/screens/WorkspaceOnboardingPage.tsx | WorkspaceOnboardingPage | /onboarding                         | Other                |
| workspaces | modules/workspaces/screens/WorkspaceSettingsPage.tsx   | WorkspaceSettingsPage   | /settings/workspace                 | Other                |
| workspaces | modules/workspaces/screens/WorkspaceMembersPage.tsx    | WorkspaceMembersPage    | /settings/members                   | Other                |

### Observed inconsistencies

- Mixed singular/plural prefixes inside sales (InvoiceDetailPage used for sales context but still aligned).
- Some edit flows reuse detail or shared upsert pages (expenses NewExpensePage handles edit; customers EditCustomerPage shares route with detail semantics).
- A few “Other” screens (copilot/settings) don’t follow CRUD patterns but are already suffixed with `Page`.
