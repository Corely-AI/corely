import React from "react";
import { Navigate, Route, useLocation, useParams } from "react-router-dom";
import { cashManagementFeature } from "@corely/web-features";
import { RequirePermission, RequireSurface } from "@corely/web-shared/shared/permissions";
import { AppShell } from "../AppShell";
import { DashboardPage } from "../../modules/core";
import { AssistantPage } from "../../modules/assistant";
import { ExpensesPage, NewExpensePage, ExpenseDetailPage } from "../../modules/expenses";
import {
  InvoicesPage,
  NewInvoicePage,
  InvoiceDetailPage,
  InvoiceAuditPage,
} from "../../modules/invoices";
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
  CrmDashboardPage,
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
  SequenceDetailPage,
  CrmEmailSettingsPage,
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
import {
  RestaurantCopilotPage,
  RestaurantFloorPlanPage,
  RestaurantKitchenQueuePage,
  RestaurantKitchenStationsPage,
  RestaurantModifierGroupsPage,
} from "../../modules/restaurant";
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
  TaxEurReportPage,
  TaxAnnualAssistantPage,
  FilingsListPage,
  FilingDetailPage,
  CreateFilingPage,
  TaxPaymentsPage,
  TaxDocumentsPage,
  taxRoutes,
} from "../../modules/tax";
import { CopilotPage } from "../../routes/copilot";
import { WorkspaceOnboardingPage } from "../../modules/workspaces";
import { RequireAuth } from "./require-auth";
import { appSettingsRoutes } from "./app-settings-routes";
import { catalogRoutes } from "./catalog-routes";
import { capabilityRoutes } from "./app-shell-capability-routes";
import { bookingRoutes } from "./booking-routes";
import { NotificationsPage } from "../../modules/notifications/screens/notifications-page";
import { CoachingEngagementsPage } from "../../modules/coaching-engagements/screens/CoachingEngagementsPage";
import { CoachingSessionsPage } from "../../modules/coaching-engagements/screens/CoachingSessionsPage";
import { CoachingEngagementDetailPage } from "../../modules/coaching-engagements/screens/CoachingEngagementDetailPage";
import { CoachingOffersPage } from "../../modules/coaching-engagements/screens/CoachingOffersPage";
import CoachingOfferDetailPage from "../../modules/coaching-engagements/screens/CoachingOfferDetailPage";
import CoachingOfferEditorPage from "../../modules/coaching-engagements/screens/CoachingOfferEditorPage";
import { useSurfaceId } from "@corely/web-shared/shared/surface";

const SurfaceAssistantPage = () => {
  const surfaceId = useSurfaceId();

  if (surfaceId === "pos") {
    return <Navigate to="/restaurant/copilot" replace />;
  }

  return <AssistantPage activeModule={surfaceId === "crm" ? "crm" : "freelancer"} />;
};

const CashLegacyRedirect = () => {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();

  return (
    <Navigate to={id ? `/cash/registers/${id}${location.search}` : "/cash/registers"} replace />
  );
};

const CashLegacyDayCloseRedirect = () => {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();

  return (
    <Navigate
      to={
        id
          ? `/cash/registers/${id}/day-close${location.search}`
          : `/cash/registers${location.search}`
      }
      replace
    />
  );
};

export const appShellRoutes = (
  <Route element={<RequireAuth />}>
    <Route element={<AppShell />}>
      <Route path="/onboarding" element={<WorkspaceOnboardingPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/dashboard/teacher" element={<TeacherDashboardPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/assistant" element={<SurfaceAssistantPage />} />
      <Route path="/assistant/t/:threadId" element={<SurfaceAssistantPage />} />
      <Route path="/cms/posts" element={<CmsPostsPage />} />
      <Route path="/cms/posts/new" element={<CmsPostEditorPage />} />
      <Route path="/cms/posts/:id" element={<CmsPostEditorPage />} />
      <Route path="/cms/posts/:id/edit" element={<CmsPostEditorPage />} />
      <Route path="/cms/comments" element={<CmsCommentsPage />} />
      <Route
        path="/restaurant/floor-plan"
        element={
          <RequireSurface surfaces={["platform", "pos"]}>
            <RestaurantFloorPlanPage />
          </RequireSurface>
        }
      />
      <Route
        path="/restaurant/copilot"
        element={
          <RequireSurface surfaces={["platform", "pos"]}>
            <RestaurantCopilotPage />
          </RequireSurface>
        }
      />
      <Route
        path="/restaurant/modifier-groups"
        element={
          <RequireSurface surfaces={["platform", "pos"]}>
            <RestaurantModifierGroupsPage />
          </RequireSurface>
        }
      />
      <Route
        path="/restaurant/kitchen-stations"
        element={
          <RequireSurface surfaces={["platform", "pos"]}>
            <RestaurantKitchenStationsPage />
          </RequireSurface>
        }
      />
      <Route
        path="/restaurant/kitchen-queue"
        element={
          <RequireSurface surfaces={["platform", "pos"]}>
            <RestaurantKitchenQueuePage />
          </RequireSurface>
        }
      />
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
      {cashManagementFeature.cashManagementRoutes().map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={<RequireSurface surfaces={["platform", "pos"]}>{route.element}</RequireSurface>}
        />
      ))}
      <Route
        path="/cash-registers"
        element={
          <RequireSurface surfaces={["platform", "pos"]}>
            <CashLegacyRedirect />
          </RequireSurface>
        }
      />
      <Route
        path="/cash-registers/:id"
        element={
          <RequireSurface surfaces={["platform", "pos"]}>
            <CashLegacyRedirect />
          </RequireSurface>
        }
      />
      <Route
        path="/cash-registers/:id/daily-close"
        element={
          <RequireSurface surfaces={["platform", "pos"]}>
            <CashLegacyDayCloseRedirect />
          </RequireSurface>
        }
      />
      <Route path="/invoices" element={<InvoicesPage />} />
      <Route path="/invoices/new" element={<NewInvoicePage />} />
      <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
      <Route path="/invoices/:id/edit" element={<InvoiceDetailPage />} />
      <Route path="/audit" element={<InvoiceAuditPage />} />
      <Route
        path="/coaching/offers"
        element={
          <RequirePermission permission="coaching.engagements.read">
            <CoachingOffersPage />
          </RequirePermission>
        }
      />
      <Route
        path="/coaching/offers/new"
        element={
          <RequirePermission permission="coaching.engagements.manage">
            <CoachingOfferEditorPage />
          </RequirePermission>
        }
      />
      <Route
        path="/coaching/offers/:offerId"
        element={
          <RequirePermission permission="coaching.engagements.read">
            <CoachingOfferDetailPage />
          </RequirePermission>
        }
      />
      <Route
        path="/coaching/offers/:offerId/edit"
        element={
          <RequirePermission permission="coaching.engagements.manage">
            <CoachingOfferEditorPage />
          </RequirePermission>
        }
      />
      <Route
        path="/coaching/engagements"
        element={
          <RequirePermission permission="coaching.engagements.read">
            <CoachingEngagementsPage />
          </RequirePermission>
        }
      />
      <Route
        path="/coaching/engagements/:engagementId"
        element={
          <RequirePermission permission="coaching.engagements.read">
            <CoachingEngagementDetailPage />
          </RequirePermission>
        }
      />
      <Route
        path="/coaching/sessions"
        element={
          <RequirePermission permission="coaching.engagements.read">
            <CoachingSessionsPage />
          </RequirePermission>
        }
      />
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
      <Route
        path="/crm"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <CrmDashboardPage />
          </RequireSurface>
        }
      />
      <Route
        path="/crm/overview"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <Navigate to="/crm" replace />
          </RequireSurface>
        }
      />
      <Route
        path="/crm/deals"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <DealsPage />
          </RequireSurface>
        }
      />
      <Route
        path="/crm/deals/new"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <NewDealPage />
          </RequireSurface>
        }
      />
      <Route
        path="/crm/deals/:id"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <DealDetailPage />
          </RequireSurface>
        }
      />
      <Route
        path="/crm/deals/:id/edit"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <DealDetailPage />
          </RequireSurface>
        }
      />
      <Route
        path="/crm/activities"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <ActivitiesPage />
          </RequireSurface>
        }
      />
      <Route
        path="/crm/activities/new"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <NewActivityPage />
          </RequireSurface>
        }
      />
      <Route
        path="/crm/leads"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <LeadsPage />
          </RequireSurface>
        }
      />
      <Route
        path="/crm/leads/new"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <NewLeadPage />
          </RequireSurface>
        }
      />
      <Route
        path="/crm/leads/:id"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <LeadDetailPage />
          </RequireSurface>
        }
      />
      <Route
        path="/crm/contacts"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <ContactsPage />
          </RequireSurface>
        }
      />
      <Route
        path="/crm/contacts/new"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <ContactFormPage />
          </RequireSurface>
        }
      />
      <Route
        path="/crm/contacts/:id"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <ContactDetailPage />
          </RequireSurface>
        }
      />
      <Route
        path="/crm/contacts/:id/edit"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <ContactFormPage />
          </RequireSurface>
        }
      />
      <Route
        path="/crm/sequences"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <SequencesPage />
          </RequireSurface>
        }
      />
      <Route
        path="/crm/sequences/new"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <NewSequencePage />
          </RequireSurface>
        }
      />
      <Route
        path="/crm/sequences/:id"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <SequenceDetailPage />
          </RequireSurface>
        }
      />
      <Route
        path="/crm/settings/email"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <CrmEmailSettingsPage />
          </RequireSurface>
        }
      />
      <Route
        path="/crm/accounts"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <AccountsPage />
          </RequireSurface>
        }
      />
      <Route
        path="/crm/accounts/new"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <AccountFormPage />
          </RequireSurface>
        }
      />
      <Route
        path="/crm/accounts/:id"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <AccountDetailPage />
          </RequireSurface>
        }
      />
      <Route
        path="/crm/accounts/:id/edit"
        element={
          <RequireSurface surfaces={["platform", "crm"]}>
            <AccountFormPage />
          </RequireSurface>
        }
      />
      <Route path="/accounting" element={<AccountingDashboard />} />
      <Route path="/accounting/setup" element={<SetupWizard />} />
      <Route path="/accounting/accounts" element={<ChartOfAccountsList />} />
      <Route path="/accounting/journal-entries" element={<JournalEntriesList />} />
      <Route path="/accounting/reports" element={<ReportsHub />} />
      {catalogRoutes}
      {bookingRoutes}
      <Route
        path="/copilot"
        element={
          <RequireSurface surfaces={["platform"]}>
            <CopilotPage />
          </RequireSurface>
        }
      />
      <Route path="/tax" element={<TaxCenterPage />} />
      <Route path="/tax/reports/eur" element={<TaxEurReportPage />} />
      <Route path="/tax/annual/:year" element={<TaxAnnualAssistantPage />} />
      <Route path="/tax/annual/:year/t/:threadId" element={<TaxAnnualAssistantPage />} />
      <Route path="/tax/filings" element={<FilingsListPage />} />
      <Route path="/tax/filings/new" element={<CreateFilingPage />} />
      <Route path="/tax/filings/:id" element={<FilingDetailPage />} />
      <Route path="/tax/payments" element={<TaxPaymentsPage />} />
      <Route path="/tax/documents" element={<TaxDocumentsPage />} />
      <Route path="/tax/settings" element={<TaxSettingsPage />} />
      {taxRoutes.map((route) => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}
      {appSettingsRoutes}
    </Route>
  </Route>
);
