import React from "react";
import { Navigate, Route } from "react-router-dom";
import { AppShell } from "../AppShell";
import { DashboardPage } from "../../modules/core";
import { AssistantPage } from "../../modules/assistant";
import { ExpensesPage, NewExpensePage, ExpenseDetailPage } from "../../modules/expenses";
import { InvoicesPage, NewInvoicePage, InvoiceDetailPage } from "../../modules/invoices";
import {
  CashRegistersScreen,
  CashRegisterDetailScreen,
  DailyCloseScreen,
} from "../../modules/cash-management";
import {
  CustomersPage,
  NewCustomerPage,
  EditCustomerPage,
  SuppliersPage,
  NewSupplierPage,
  EditSupplierPage,
  StudentsPage,
  NewStudentPage,
  StudentDetailPage,
  BirthdayRemindersPage,
} from "../../modules/customers";
import { FormsPage, NewFormPage, FormDetailPage } from "../../modules/forms";
import { IssuesListPage, IssueDetailPage, NewIssuePage } from "../../modules/issues";
import {
  ClassGroupsListPage,
  ClassGroupEditorPage,
  ClassGroupDetailPage,
  CohortsListScreen,
  CohortDetailScreen,
  ProgramsListScreen,
  ProgramDetailScreen,
  SessionsPage,
  SessionDetailPage,
  ClassesBillingPage,
  TeacherDashboardPage,
} from "../../modules/classes";
import {
  DealsPage,
  NewDealPage,
  DealDetailPage,
  ActivitiesPage,
  NewActivityPage,
  LeadsPage,
  NewLeadPage,
  LeadDetailPage,
  ContactsPage,
  ContactFormPage,
  ContactDetailPage,
  SequencesPage,
  NewSequencePage,
  AccountsPage,
  AccountDetailPage,
  AccountFormPage,
} from "../../modules/crm";
import {
  AccountingDashboard,
  SetupWizard,
  ChartOfAccountsList,
  JournalEntriesList,
  ReportsHub,
} from "../../modules/accounting/screens";
import { CmsPostsPage, CmsPostEditorPage, CmsCommentsPage } from "../../modules/cms";
import {
  WebsiteSitesPage,
  WebsiteSiteEditorPage,
  WebsiteDomainsPage,
  WebsitePagesPage,
  WebsitePageEditorPage,
  WebsiteMenusPage,
  WebsiteFeedbackConfigPage,
  WebsiteWallOfLovePage,
} from "../../modules/website";
import {
  RentalPropertiesPage,
  RentalPropertyEditorPage,
  RentalCategoriesPage,
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
import { directoryRoutes } from "../../modules/directory";
import {
  TaxSettingsPage,
  TaxCenterPage,
  FilingsListPage,
  FilingDetailPage,
  CreateFilingPage,
  TaxPaymentsPage,
  TaxDocumentsPage,
} from "../../modules/tax";
import { CopilotPage } from "../../routes/copilot";
import { WorkspaceOnboardingPage } from "../../modules/workspaces";
import { RequireAuth } from "./require-auth";
import { RequirePermission } from "../../modules/settings/components/RequirePermission";
import { appSettingsRoutes } from "./app-settings-routes";
import { catalogRoutes } from "./catalog-routes";
import { capabilityRoutes } from "./app-shell-capability-routes";
import { bookingRoutes } from "./booking-routes";

export const appShellRoutes = (
  <Route element={<RequireAuth />}>
    <Route element={<AppShell />}>
      <Route path="/onboarding" element={<WorkspaceOnboardingPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/dashboard/teacher" element={<TeacherDashboardPage />} />
      <Route path="/assistant" element={<AssistantPage />} />
      <Route path="/assistant/t/:threadId" element={<AssistantPage />} />
      <Route path="/cms/posts" element={<CmsPostsPage />} />
      <Route path="/cms/posts/new" element={<CmsPostEditorPage />} />
      <Route path="/cms/posts/:id" element={<CmsPostEditorPage />} />
      <Route path="/cms/posts/:id/edit" element={<CmsPostEditorPage />} />
      <Route path="/cms/comments" element={<CmsCommentsPage />} />
      <Route path="/website/sites" element={<WebsiteSitesPage />} />
      <Route path="/website/sites/new" element={<WebsiteSiteEditorPage />} />
      <Route path="/website/sites/:siteId/edit" element={<WebsiteSiteEditorPage />} />
      <Route path="/website/sites/:siteId/domains" element={<WebsiteDomainsPage />} />
      <Route path="/website/sites/:siteId/menus" element={<WebsiteMenusPage />} />
      <Route path="/website/sites/:siteId/feedback" element={<WebsiteFeedbackConfigPage />} />
      <Route path="/website/sites/:siteId/wall-of-love" element={<WebsiteWallOfLovePage />} />
      <Route path="/website/sites/:siteId/pages" element={<WebsitePagesPage />} />
      <Route path="/website/sites/:siteId/pages/new" element={<WebsitePageEditorPage />} />
      <Route path="/website/pages/:pageId/edit" element={<WebsitePageEditorPage />} />
      <Route path="/rentals/properties" element={<RentalPropertiesPage />} />
      <Route path="/rentals/properties/new" element={<RentalPropertyEditorPage />} />
      <Route path="/rentals/properties/:id/edit" element={<RentalPropertyEditorPage />} />
      <Route path="/rentals/categories" element={<RentalCategoriesPage />} />
      {directoryRoutes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <RequirePermission permission="platform.tenants.write">
              {route.element}
            </RequirePermission>
          }
        />
      ))}
      <Route path="/portfolio/showcases" element={<ShowcasesPage />} />
      <Route path="/portfolio/showcases/new" element={<ShowcaseEditorPage />} />
      <Route path="/portfolio/showcases/:id/edit" element={<ShowcaseEditorPage />} />
      <Route path="/portfolio/showcases/:showcaseId/profile" element={<ShowcaseProfilePage />} />
      <Route path="/portfolio/showcases/:showcaseId/projects" element={<ProjectsPage />} />
      <Route path="/portfolio/showcases/:showcaseId/projects/new" element={<ProjectEditorPage />} />
      <Route path="/portfolio/projects/:id/edit" element={<ProjectEditorPage />} />
      <Route path="/portfolio/showcases/:showcaseId/clients" element={<ClientsPage />} />
      <Route path="/portfolio/showcases/:showcaseId/clients/new" element={<ClientEditorPage />} />
      <Route path="/portfolio/clients/:id/edit" element={<ClientEditorPage />} />
      <Route path="/portfolio/showcases/:showcaseId/services" element={<ServicesPage />} />
      <Route path="/portfolio/showcases/:showcaseId/services/new" element={<ServiceEditorPage />} />
      <Route path="/portfolio/services/:id/edit" element={<ServiceEditorPage />} />
      <Route path="/portfolio/showcases/:showcaseId/team" element={<TeamPage />} />
      <Route path="/portfolio/showcases/:showcaseId/team/new" element={<TeamEditorPage />} />
      <Route path="/portfolio/team/:id/edit" element={<TeamEditorPage />} />
      <Route path="/forms" element={<FormsPage />} />
      <Route path="/forms/new" element={<NewFormPage />} />
      <Route path="/forms/:id" element={<FormDetailPage />} />
      <Route path="/issues" element={<IssuesListPage />} />
      <Route path="/class-groups" element={<ClassGroupsListPage />} />
      <Route path="/class-groups/new" element={<ClassGroupEditorPage />} />
      <Route path="/class-groups/:id" element={<ClassGroupDetailPage />} />
      <Route path="/class-groups/:id/edit" element={<ClassGroupEditorPage />} />
      <Route path="/classes/class-groups" element={<Navigate to="/classes/cohorts" replace />} />
      <Route
        path="/classes/class-groups/new"
        element={<Navigate to="/classes/cohorts/new" replace />}
      />
      <Route path="/classes/class-groups/:id" element={<CohortDetailScreen />} />
      <Route path="/classes/class-groups/:id/edit" element={<ClassGroupEditorPage />} />
      <Route path="/classes/cohorts" element={<CohortsListScreen />} />
      <Route path="/classes/cohorts/new" element={<ClassGroupEditorPage />} />
      <Route path="/classes/cohorts/:id" element={<CohortDetailScreen />} />
      <Route path="/classes/cohorts/:id/edit" element={<ClassGroupEditorPage />} />
      <Route path="/programs" element={<ProgramsListScreen />} />
      <Route path="/programs/new" element={<ProgramDetailScreen />} />
      <Route path="/programs/:id" element={<ProgramDetailScreen />} />
      <Route path="/programs/:id/edit" element={<ProgramDetailScreen />} />
      <Route path="/classes/programs" element={<ProgramsListScreen />} />
      <Route path="/classes/programs/new" element={<ProgramDetailScreen />} />
      <Route path="/classes/programs/:id" element={<ProgramDetailScreen />} />
      <Route path="/classes/programs/:id/edit" element={<ProgramDetailScreen />} />
      <Route path="/sessions" element={<SessionsPage />} />
      <Route path="/sessions/:id" element={<SessionDetailPage />} />
      <Route path="/billing" element={<ClassesBillingPage />} />
      <Route path="/issues/new" element={<NewIssuePage />} />
      <Route path="/issues/:id" element={<IssueDetailPage />} />
      <Route path="/expenses" element={<ExpensesPage />} />
      <Route path="/expenses/new" element={<NewExpensePage />} />
      <Route path="/expenses/:id" element={<ExpenseDetailPage />} />
      <Route path="/expenses/:id/edit" element={<NewExpensePage />} />
      <Route path="/cash-registers" element={<CashRegistersScreen />} />
      <Route path="/cash-registers/:id" element={<CashRegisterDetailScreen />} />
      <Route path="/cash-registers/:id/daily-close" element={<DailyCloseScreen />} />
      <Route path="/invoices" element={<InvoicesPage />} />
      <Route path="/invoices/new" element={<NewInvoicePage />} />
      <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
      <Route path="/invoices/:id/edit" element={<InvoiceDetailPage />} />
      {capabilityRoutes}
      <Route
        path="/customers"
        element={
          <RequirePermission permission="party.customers.read">
            <CustomersPage />
          </RequirePermission>
        }
      />
      <Route
        path="/customers/new"
        element={
          <RequirePermission permission="party.customers.manage">
            <NewCustomerPage />
          </RequirePermission>
        }
      />
      <Route
        path="/customers/:id"
        element={
          <RequirePermission permission="party.customers.manage">
            <EditCustomerPage />
          </RequirePermission>
        }
      />
      <Route
        path="/customers/:id/edit"
        element={
          <RequirePermission permission="party.customers.manage">
            <EditCustomerPage />
          </RequirePermission>
        }
      />
      <Route
        path="/customers/birthdays"
        element={
          <RequirePermission permission="party.customers.read">
            <BirthdayRemindersPage />
          </RequirePermission>
        }
      />
      <Route
        path="/suppliers"
        element={
          <RequirePermission permission="party.customers.read">
            <SuppliersPage />
          </RequirePermission>
        }
      />
      <Route
        path="/suppliers/new"
        element={
          <RequirePermission permission="party.customers.manage">
            <NewSupplierPage />
          </RequirePermission>
        }
      />
      <Route
        path="/suppliers/:id"
        element={
          <RequirePermission permission="party.customers.manage">
            <EditSupplierPage />
          </RequirePermission>
        }
      />
      <Route
        path="/suppliers/:id/edit"
        element={
          <RequirePermission permission="party.customers.manage">
            <EditSupplierPage />
          </RequirePermission>
        }
      />
      <Route path="/students" element={<StudentsPage />} />
      <Route path="/students/new" element={<NewStudentPage />} />
      <Route path="/students/:id" element={<StudentDetailPage />} />
      <Route path="/students/:id/edit" element={<StudentDetailPage />} />
      <Route path="/crm/deals" element={<DealsPage />} />
      <Route path="/crm/deals/new" element={<NewDealPage />} />
      <Route path="/crm/deals/:id" element={<DealDetailPage />} />
      <Route path="/crm/deals/:id/edit" element={<DealDetailPage />} />
      <Route path="/crm/activities" element={<ActivitiesPage />} />
      <Route path="/crm/activities/new" element={<NewActivityPage />} />
      <Route path="/crm/leads" element={<LeadsPage />} />
      <Route path="/crm/leads/new" element={<NewLeadPage />} />
      <Route path="/crm/leads/:id" element={<LeadDetailPage />} />
      <Route path="/crm/contacts" element={<ContactsPage />} />
      <Route path="/crm/contacts/new" element={<ContactFormPage />} />
      <Route path="/crm/contacts/:id" element={<ContactDetailPage />} />
      <Route path="/crm/contacts/:id/edit" element={<ContactFormPage />} />
      <Route path="/crm/sequences" element={<SequencesPage />} />
      <Route path="/crm/sequences/new" element={<NewSequencePage />} />
      <Route path="/crm/accounts" element={<AccountsPage />} />
      <Route path="/crm/accounts/new" element={<AccountFormPage />} />
      <Route path="/crm/accounts/:id" element={<AccountDetailPage />} />
      <Route path="/crm/accounts/:id/edit" element={<AccountFormPage />} />
      <Route path="/accounting" element={<AccountingDashboard />} />
      <Route path="/accounting/setup" element={<SetupWizard />} />
      <Route path="/accounting/accounts" element={<ChartOfAccountsList />} />
      <Route path="/accounting/journal-entries" element={<JournalEntriesList />} />
      <Route path="/accounting/reports" element={<ReportsHub />} />
      {catalogRoutes}
      {bookingRoutes}
      <Route path="/copilot" element={<CopilotPage />} />
      <Route path="/tax" element={<TaxCenterPage />} />
      <Route path="/tax/filings" element={<FilingsListPage />} />
      <Route path="/tax/filings/new" element={<CreateFilingPage />} />
      <Route path="/tax/filings/:id" element={<FilingDetailPage />} />
      <Route path="/tax/payments" element={<TaxPaymentsPage />} />
      <Route path="/tax/documents" element={<TaxDocumentsPage />} />
      <Route path="/tax/settings" element={<TaxSettingsPage />} />
      {appSettingsRoutes}
    </Route>
  </Route>
);
