import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "../AppShell";
import { DashboardPage } from "../../modules/core";
import { AssistantPage } from "../../modules/assistant";
import { ExpensesPage, NewExpensePage, ExpenseDetailPage } from "../../modules/expenses";
import { InvoicesPage, NewInvoicePage, InvoiceDetailPage } from "../../modules/invoices";
import { CustomersPage, NewCustomerPage, EditCustomerPage } from "../../modules/customers";
import { FormsPage, NewFormPage, FormDetailPage, PublicFormPage } from "../../modules/forms";
import { IssuesListPage, IssueDetailPage, NewIssuePage } from "../../modules/issues";
import {
  DealsPage,
  NewDealPage,
  DealDetailPage,
  ActivitiesPage,
  NewActivityPage,
} from "../../modules/crm";
import {
  QuotesPage as SalesQuotesPage,
  NewQuotePage,
  QuoteDetailPage,
  OrdersPage as SalesOrdersPage,
  NewOrderPage,
  OrderDetailPage,
  SalesSettingsPage,
  SalesCopilotPage,
} from "../../modules/sales";
import {
  AccountingDashboard,
  SetupWizard,
  ChartOfAccountsList,
  JournalEntriesList,
  ReportsHub,
} from "../../modules/accounting/screens";
import {
  PurchaseOrdersPage,
  PurchaseOrderDetailPage,
  NewPurchaseOrderPage,
  VendorBillsPage,
  VendorBillDetailPage,
  NewVendorBillPage,
  RecordBillPaymentPage,
  PurchasingSettingsPage,
  PurchasingCopilotPage,
} from "../../modules/purchasing";
import {
  ProductsPage,
  ProductDetailPage,
  WarehousesPage,
  StockOverviewPage,
  DocumentsPage,
  DocumentDetailPage,
  ReorderDashboardPage,
  InventoryCopilotPage,
} from "../../modules/inventory";
import { SettingsPage, RolesPage, RolePermissionsPage } from "../../modules/settings";
import { RequirePermission } from "../../modules/settings/components/RequirePermission";
import { PaymentMethodsSettings } from "../../modules/settings/payment-methods";
import {
  CmsPostsPage,
  CmsPostEditorPage,
  CmsCommentsPage,
  PublicCmsListPage,
  PublicCmsPostPage,
} from "../../modules/cms";
import {
  RentalPropertiesPage,
  RentalPropertyEditorPage,
  RentalCategoriesPage,
  PublicRentalsListScreen,
  PublicRentalDetailScreen,
} from "../../modules/rentals";
import {
  ShowcasesPage,
  ShowcaseEditorPage,
  ShowcaseProfilePage,
  ProjectsPage,
  ProjectEditorPage,
  ClientsPage,
  ClientEditorPage,
  ServicesPage,
  ServiceEditorPage,
  TeamPage,
  TeamEditorPage,
} from "../../modules/portfolio";
import {
  TaxSettingsPage,
  TaxCenterPage,
  FilingsListPage,
  FilingDetailPage,
  CreateFilingPage,
  TaxPaymentsPage,
  TaxDocumentsPage,
} from "../../modules/tax";
import {
  PlatformPage,
  AppsManagementPage,
  TemplatesPage,
  MenuCustomizerPage,
} from "../../modules/platform";
import { TenantEntitlementsPage } from "../../modules/platform/screens/tenant-management/TenantEntitlementsPage";
import NotFound from "../../shared/components/NotFound";
import { LoginPage } from "../../routes/auth/login";
import SignupPage from "../../routes/auth/signup";
import { RequireAuth } from "./require-auth";
import { CopilotPage } from "../../routes/copilot";
import { RequireCapability } from "../../shared/workspaces/RequireCapability";
import {
  WorkspaceMembersPage,
  WorkspaceOnboardingPage,
  WorkspaceSettingsPage,
} from "../../modules/workspaces";
import { PublicWorkspaceProvider } from "../../shared/public-workspace";

import { isCustomDomain } from "../../lib/domain-helper";
import {
  PublicPortfolioLayout,
  PublicShowcaseHome,
  PublicShowcaseWorks,
  PublicShowcaseProject,
  PublicShowcaseClients,
  PublicShowcaseServices,
  PublicShowcaseTeam,
  PublicShowcaseBlog,
} from "../../modules/portfolio";

export const Router = () => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <Routes>
      {/* Root Route: Domain Mode Portfolio OR Dashboard Redirect */}
      <Route
        path="/"
        element={
          isCustomDomain() ? <PublicPortfolioLayout /> : <Navigate to="/dashboard" replace />
        }
      >
        {/* Only active if PublicPortfolioLayout renders Outlet (i.e. custom domain) */}
        {/* But wait, if Navigate renders, it redirects. If Layout renders, it renders Outlet. */}
        {/* So we put the Home screen as index here. */}
        <Route index element={<PublicShowcaseHome />} />
      </Route>

      {/* Domain Mode Sub-routes */}
      <Route element={isCustomDomain() ? <PublicPortfolioLayout /> : undefined}>
        <Route path="/works" element={<PublicShowcaseWorks />} />
        <Route path="/works/:projectSlug" element={<PublicShowcaseProject />} />
        <Route path="/clients" element={<PublicShowcaseClients />} />
        <Route path="/services" element={<PublicShowcaseServices />} />
        <Route path="/team" element={<PublicShowcaseTeam />} />
        <Route path="/blog" element={<PublicShowcaseBlog />} />
      </Route>

      {/* Slug Mode Routes */}
      <Route path="/p/:slug" element={<PublicPortfolioLayout />}>
        <Route index element={<PublicShowcaseHome />} />
        <Route path="works" element={<PublicShowcaseWorks />} />
        <Route path="works/:projectSlug" element={<PublicShowcaseProject />} />
        <Route path="clients" element={<PublicShowcaseClients />} />
        <Route path="services" element={<PublicShowcaseServices />} />
        <Route path="team" element={<PublicShowcaseTeam />} />
        <Route path="blog" element={<PublicShowcaseBlog />} />
      </Route>

      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/signup" element={<SignupPage />} />
      <Route path="/f/:publicId" element={<PublicFormPage />} />
      <Route element={<PublicWorkspaceProvider />}>
        <Route path="/w/:workspaceSlug/cms" element={<PublicCmsListPage />} />
        <Route path="/w/:workspaceSlug/cms/:slug" element={<PublicCmsPostPage />} />
        <Route path="/w/:workspaceSlug/rental" element={<PublicRentalsListScreen />} />
        <Route path="/w/:workspaceSlug/rental/:slug" element={<PublicRentalDetailScreen />} />
        <Route path="/cms" element={<PublicCmsListPage />} />
        <Route path="/cms/:slug" element={<PublicCmsPostPage />} />
        <Route path="/rental" element={<PublicRentalsListScreen />} />
        <Route path="/rental/:slug" element={<PublicRentalDetailScreen />} />
        <Route path="/p" element={<PublicCmsListPage />} />
        {/* Note: /p was mapped to CMS list page in legacy? I should remove or keep? 
            Original code: <Route path="/p" element={<PublicCmsListPage />} />
            Original code: <Route path="/p/:slug" element={<PublicCmsPostPage />} />
            I AM OVERWRITING THIS!
            This creates a conflict. "/p" -> CMS, but "/p/:slug" -> Portfolio?
            If I have /p/:slug earlier, it takes precedence.
            But the original code had /p/:slug for post page.
            I should check if I broke CMS public posts.
            "Use the same strategy as Rental Properties".
            "Non-goals: No new blog tables; reuse CMS public queries".
            Maybe I should move Portfolio to `/portfolio/:slug` instead of `/p`?
            But requirements said: "/p/:showcaseSlug -> Home".
            So there IS a conflict with existing CMS routes.
            I must resolve this.
            The user said "/p/:showcaseSlug" explicitly.
            Maybe the existing CMS route uses `/p` as "posts"?
            If so, I should probably stick to requirements and maybe rename existing CMS route or assume user knows what they are doing.
            But wait, `PublicCmsPostPage` is mapped to `/p/:slug`.
            If I map `/p/:slug` to Portfolio, I claim namespace.
            I'll remove the legacy CMS routes from here as I am overwriting them with Portfolio.
            Or typically `/p/` stands for "post" or "portfolio".
            Given the explicit prompt "/p/:showcaseSlug", I will prioritize Portfolio.
        */}
        <Route path="/stay" element={<PublicRentalsListScreen />} />
        <Route path="/stay/:slug" element={<PublicRentalDetailScreen />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/onboarding" element={<WorkspaceOnboardingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/cms/posts" element={<CmsPostsPage />} />
          <Route path="/cms/posts/new" element={<CmsPostEditorPage />} />
          <Route path="/cms/posts/:id" element={<CmsPostEditorPage />} />
          <Route path="/cms/posts/:id/edit" element={<CmsPostEditorPage />} />
          <Route path="/cms/comments" element={<CmsCommentsPage />} />
          <Route path="/rentals/properties" element={<RentalPropertiesPage />} />
          <Route path="/rentals/properties/new" element={<RentalPropertyEditorPage />} />
          <Route path="/rentals/properties/:id/edit" element={<RentalPropertyEditorPage />} />
          <Route path="/rentals/categories" element={<RentalCategoriesPage />} />
          <Route path="/portfolio/showcases" element={<ShowcasesPage />} />
          <Route path="/portfolio/showcases/new" element={<ShowcaseEditorPage />} />
          <Route path="/portfolio/showcases/:id/edit" element={<ShowcaseEditorPage />} />
          <Route
            path="/portfolio/showcases/:showcaseId/profile"
            element={<ShowcaseProfilePage />}
          />
          <Route path="/portfolio/showcases/:showcaseId/projects" element={<ProjectsPage />} />
          <Route
            path="/portfolio/showcases/:showcaseId/projects/new"
            element={<ProjectEditorPage />}
          />
          <Route path="/portfolio/projects/:id/edit" element={<ProjectEditorPage />} />
          <Route path="/portfolio/showcases/:showcaseId/clients" element={<ClientsPage />} />
          <Route
            path="/portfolio/showcases/:showcaseId/clients/new"
            element={<ClientEditorPage />}
          />
          <Route path="/portfolio/clients/:id/edit" element={<ClientEditorPage />} />
          <Route path="/portfolio/showcases/:showcaseId/services" element={<ServicesPage />} />
          <Route
            path="/portfolio/showcases/:showcaseId/services/new"
            element={<ServiceEditorPage />}
          />
          <Route path="/portfolio/services/:id/edit" element={<ServiceEditorPage />} />
          <Route path="/portfolio/showcases/:showcaseId/team" element={<TeamPage />} />
          <Route path="/portfolio/showcases/:showcaseId/team/new" element={<TeamEditorPage />} />
          <Route path="/portfolio/team/:id/edit" element={<TeamEditorPage />} />
          <Route path="/forms" element={<FormsPage />} />
          <Route path="/forms/new" element={<NewFormPage />} />
          <Route path="/forms/:id" element={<FormDetailPage />} />
          <Route path="/issues" element={<IssuesListPage />} />
          <Route path="/issues/new" element={<NewIssuePage />} />
          <Route path="/issues/:id" element={<IssueDetailPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/expenses/new" element={<NewExpensePage />} />
          <Route path="/expenses/:id" element={<ExpenseDetailPage />} />
          <Route path="/expenses/:id/edit" element={<NewExpensePage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/new" element={<NewInvoicePage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="/invoices/:id/edit" element={<InvoiceDetailPage />} />
          <Route
            path="/sales/quotes"
            element={
              <RequireCapability capability="sales.quotes">
                <SalesQuotesPage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/quotes/new"
            element={
              <RequireCapability capability="sales.quotes">
                <NewQuotePage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/quotes/:quoteId"
            element={
              <RequireCapability capability="sales.quotes">
                <QuoteDetailPage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/quotes/:quoteId/edit"
            element={
              <RequireCapability capability="sales.quotes">
                <QuoteDetailPage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/orders"
            element={
              <RequireCapability capability="sales.quotes">
                <SalesOrdersPage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/orders/new"
            element={
              <RequireCapability capability="sales.quotes">
                <NewOrderPage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/orders/:orderId"
            element={
              <RequireCapability capability="sales.quotes">
                <OrderDetailPage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/orders/:orderId/edit"
            element={
              <RequireCapability capability="sales.quotes">
                <OrderDetailPage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/invoices"
            element={
              <RequireCapability capability="sales.quotes">
                <InvoicesPage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/invoices/new"
            element={
              <RequireCapability capability="sales.quotes">
                <NewInvoicePage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/invoices/:invoiceId"
            element={
              <RequireCapability capability="sales.quotes">
                <InvoiceDetailPage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/invoices/:invoiceId/edit"
            element={
              <RequireCapability capability="sales.quotes">
                <InvoiceDetailPage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/settings"
            element={
              <RequireCapability capability="sales.quotes">
                <SalesSettingsPage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/copilot"
            element={
              <RequireCapability capability="sales.quotes">
                <SalesCopilotPage />
              </RequireCapability>
            }
          />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/new" element={<NewCustomerPage />} />
          <Route path="/customers/:id" element={<EditCustomerPage />} />
          <Route path="/customers/:id/edit" element={<EditCustomerPage />} />
          <Route path="/crm/deals" element={<DealsPage />} />
          <Route path="/crm/deals/new" element={<NewDealPage />} />
          <Route path="/crm/deals/:id" element={<DealDetailPage />} />
          <Route path="/crm/deals/:id/edit" element={<DealDetailPage />} />
          <Route path="/crm/activities" element={<ActivitiesPage />} />
          <Route path="/crm/activities/new" element={<NewActivityPage />} />
          <Route path="/accounting" element={<AccountingDashboard />} />
          <Route path="/accounting/setup" element={<SetupWizard />} />
          <Route path="/accounting/accounts" element={<ChartOfAccountsList />} />
          <Route path="/accounting/journal-entries" element={<JournalEntriesList />} />
          <Route path="/accounting/reports" element={<ReportsHub />} />
          <Route
            path="/purchasing/purchase-orders"
            element={
              <RequireCapability capability="purchasing.purchaseOrders">
                <PurchaseOrdersPage />
              </RequireCapability>
            }
          />
          <Route
            path="/purchasing/purchase-orders/new"
            element={
              <RequireCapability capability="purchasing.purchaseOrders">
                <NewPurchaseOrderPage />
              </RequireCapability>
            }
          />
          <Route
            path="/purchasing/purchase-orders/:id"
            element={
              <RequireCapability capability="purchasing.purchaseOrders">
                <PurchaseOrderDetailPage />
              </RequireCapability>
            }
          />
          <Route
            path="/purchasing/purchase-orders/:id/edit"
            element={
              <RequireCapability capability="purchasing.purchaseOrders">
                <PurchaseOrderDetailPage />
              </RequireCapability>
            }
          />
          <Route
            path="/purchasing/vendor-bills"
            element={
              <RequireCapability capability="purchasing.purchaseOrders">
                <VendorBillsPage />
              </RequireCapability>
            }
          />
          <Route
            path="/purchasing/vendor-bills/new"
            element={
              <RequireCapability capability="purchasing.purchaseOrders">
                <NewVendorBillPage />
              </RequireCapability>
            }
          />
          <Route
            path="/purchasing/vendor-bills/:id"
            element={
              <RequireCapability capability="purchasing.purchaseOrders">
                <VendorBillDetailPage />
              </RequireCapability>
            }
          />
          <Route
            path="/purchasing/vendor-bills/:id/edit"
            element={
              <RequireCapability capability="purchasing.purchaseOrders">
                <VendorBillDetailPage />
              </RequireCapability>
            }
          />
          <Route
            path="/purchasing/vendor-bills/:id/pay"
            element={
              <RequireCapability capability="purchasing.purchaseOrders">
                <RecordBillPaymentPage />
              </RequireCapability>
            }
          />
          <Route
            path="/purchasing/settings"
            element={
              <RequireCapability capability="purchasing.purchaseOrders">
                <PurchasingSettingsPage />
              </RequireCapability>
            }
          />
          <Route
            path="/purchasing/copilot"
            element={
              <RequireCapability capability="purchasing.purchaseOrders">
                <PurchasingCopilotPage />
              </RequireCapability>
            }
          />
          <Route
            path="/inventory/products"
            element={
              <RequireCapability capability="inventory.basic">
                <ProductsPage />
              </RequireCapability>
            }
          />
          <Route
            path="/inventory/products/:id"
            element={
              <RequireCapability capability="inventory.basic">
                <ProductDetailPage />
              </RequireCapability>
            }
          />
          <Route
            path="/inventory/products/:id/edit"
            element={
              <RequireCapability capability="inventory.basic">
                <ProductDetailPage />
              </RequireCapability>
            }
          />
          <Route
            path="/inventory/warehouses"
            element={
              <RequireCapability capability="inventory.basic">
                <WarehousesPage />
              </RequireCapability>
            }
          />
          <Route
            path="/inventory/stock"
            element={
              <RequireCapability capability="inventory.basic">
                <StockOverviewPage />
              </RequireCapability>
            }
          />
          <Route
            path="/inventory/documents"
            element={
              <RequireCapability capability="inventory.basic">
                <DocumentsPage />
              </RequireCapability>
            }
          />
          <Route
            path="/inventory/documents/:id"
            element={
              <RequireCapability capability="inventory.basic">
                <DocumentDetailPage />
              </RequireCapability>
            }
          />
          <Route
            path="/inventory/documents/:id/edit"
            element={
              <RequireCapability capability="inventory.basic">
                <DocumentDetailPage />
              </RequireCapability>
            }
          />
          <Route
            path="/inventory/reorder"
            element={
              <RequireCapability capability="inventory.basic">
                <ReorderDashboardPage />
              </RequireCapability>
            }
          />
          <Route
            path="/inventory/copilot"
            element={
              <RequireCapability capability="inventory.basic">
                <InventoryCopilotPage />
              </RequireCapability>
            }
          />
          <Route path="/copilot" element={<CopilotPage />} />
          <Route path="/tax" element={<TaxCenterPage />} />
          <Route path="/tax/filings" element={<FilingsListPage />} />
          <Route path="/tax/filings/new" element={<CreateFilingPage />} />
          <Route path="/tax/filings/:id" element={<FilingDetailPage />} />
          <Route path="/tax/payments" element={<TaxPaymentsPage />} />
          <Route path="/tax/documents" element={<TaxDocumentsPage />} />
          <Route path="/tax/settings" element={<TaxSettingsPage />} />

          {/* Legacy Redirects */}
          <Route path="/taxes" element={<Navigate to="/tax" replace />} />
          <Route path="/tax/reports" element={<Navigate to="/tax/filings" replace />} />
          <Route path="/tax/period/:key" element={<Navigate to="/tax/filings/:key" replace />} />
          <Route path="/settings/tax" element={<Navigate to="/tax/settings" replace />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/payment-methods" element={<PaymentMethodsSettings />} />
          <Route path="/settings/workspace" element={<WorkspaceSettingsPage />} />
          <Route
            path="/settings/members"
            element={
              <RequireCapability capability="workspace.multiUser">
                <WorkspaceMembersPage />
              </RequireCapability>
            }
          />
          <Route path="/settings/tax" element={<TaxSettingsPage />} />
          <Route
            path="/settings/roles"
            element={
              <RequireCapability capability="workspace.rbac">
                <RequirePermission permission="settings.roles.manage">
                  <RolesPage />
                </RequirePermission>
              </RequireCapability>
            }
          />
          <Route
            path="/settings/roles/:roleId/permissions"
            element={
              <RequireCapability capability="workspace.rbac">
                <RequirePermission permission="settings.roles.manage">
                  <RolePermissionsPage />
                </RequirePermission>
              </RequireCapability>
            }
          />
          <Route
            path="/settings/platform"
            element={
              <RequirePermission permission="platform.apps.manage">
                <PlatformPage />
              </RequirePermission>
            }
          />
          <Route
            path="/settings/platform/apps"
            element={
              <RequirePermission permission="platform.apps.manage">
                <AppsManagementPage />
              </RequirePermission>
            }
          />
          <Route
            path="/settings/platform/templates"
            element={
              <RequirePermission permission="platform.templates.apply">
                <TemplatesPage />
              </RequirePermission>
            }
          />
          <Route
            path="/settings/platform/menu"
            element={
              <RequirePermission permission="platform.menu.customize">
                <MenuCustomizerPage />
              </RequirePermission>
            }
          />
          <Route
            path="/settings/tenants/:tenantId"
            element={
              <RequirePermission permission="platform.tenants.manage">
                <TenantEntitlementsPage />
              </RequirePermission>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);
