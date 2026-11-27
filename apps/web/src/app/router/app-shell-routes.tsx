import { StaffProfilePage } from "../../modules/people/staff-profile-extensions";
import { BackofficeDirectory } from "../../modules/app-center/backoffice-directory";
import { getTaskCreationGuidance } from "../../modules/tasks/task-creation-guidance";
import { DailyWorkPage } from "@corely/web-features/modules/tasks/daily-work-page";
import { PeopleDirectoryPage, StaffJourneyPage } from "@corely/web-features/modules/people";
import React from "react";
import { Navigate, Route, useLocation, useParams } from "react-router-dom";
import { posAdminRoutes } from "@corely/web-features/features/pos-admin";
import { RequirePermission, RequireSurface } from "@corely/web-shared/shared/permissions";
import { PageLoadingSkeleton } from "@corely/web-shared/shared/components/page-loading-skeleton";
import { SignWorkspace } from "./sign-workspace";
import { AppShell } from "../AppShell";
import { DashboardPage } from "../../modules/core";
import { AssistantPage } from "../../modules/assistant";
import {
  ExpensesPage,
  NewExpensePage,
  ExpenseDetailPage,
  ReceiptInboxPage,
} from "../../modules/expenses";
import {
  InvoicesPage,
  NewInvoicePage,
  InvoiceDetailPage,
  InvoiceAuditPage,
} from "../../modules/invoices";
import { NewStudentPage } from "../../modules/customers";
import { FormsPage, NewFormPage, FormDetailPage } from "../../modules/forms";
import {
  IssuesListPage,
  IssueDetailPage,
  NewIssuePage,
  SubmitRequestPage,
} from "../../modules/issues";
import { TeacherDashboardPage } from "../../modules/classes";
import {
  AccountingDashboard,
  SetupWizard,
  ChartOfAccountsList,
  JournalEntriesList,
  ReportsHub,
} from "../../modules/accounting/screens";
import { CmsPostsPage, CmsPostEditorPage, CmsCommentsPage } from "../../modules/cms";
import {
  RentalPropertiesPage,
  RentalPropertyEditorPage,
  RentalCategoriesPage,
} from "../../modules/rentals";
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
import {
  classRoutes,
  crmRoutes,
  customerRoutes,
  portfolioRoutes,
  restaurantRoutes,
  websiteRoutes,
} from "./app-shell-domain-routes";
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

const OpenBukStudio = React.lazy(() => import("../../modules/openbuk/embedded-studio"));
const CashLayout = React.lazy(() => import("./cash-layout"));
const CashOnboarding = React.lazy(() => import("./cash-onboarding"));
const FreelancerSettings = React.lazy(() => import("../../modules/freelancer/settings-page"));

const SignOverviewPage = React.lazy(
  () => import("@corely/web-features/modules/sign/overview-page")
);
const SignRequestPage = React.lazy(() => import("@corely/web-features/modules/sign/request-page"));
const SignTemplateEditor = React.lazy(
  () => import("@corely/web-features/modules/sign/template-page")
);

const SurfaceAssistantPage = () => {
  const surfaceId = useSurfaceId();

  if (surfaceId === "pos") {
    return <Navigate to="/restaurant/copilot" replace />;
  }

  return <AssistantPage activeModule={surfaceId === "crm" ? "crm" : "freelancer"} />;
};

const CashLegacyRedirect = ({ dayClose = false }: { dayClose?: boolean }) => {
  const { id } = useParams();
  const { search, hash } = useLocation();
  const register = id ? `/cash/registers/${encodeURIComponent(id)}` : "/cash/registers";
  return (
    <Navigate
      to={{ pathname: dayClose && id ? `${register}/day-close` : register, search, hash }}
      replace
    />
  );
};

const PosPackPlaceholderPage = ({ title, description }: { title: string; description: string }) => (
  <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-10">
    <div className="space-y-2">
      <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
        POS Vertical Pack
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

export const appShellRoutes = (
  <Route element={<RequireAuth />}>
    {["/onboarding/cash-management", "/onboarding/cash-management/resume"].map((path) => (
      <Route
        key={path}
        path={path}
        element={
          <RequireSurface surfaces={["platform", "pos"]}>
            <React.Suspense fallback={<PageLoadingSkeleton variant="form" />}>
              <CashOnboarding />
            </React.Suspense>
          </RequireSurface>
        }
      />
    ))}
    <Route
      path="/openbuk/app/*"
      element={
        <RequireSurface surfaces={["platform"]}>
          <React.Suspense fallback={<PageLoadingSkeleton variant="list" />}>
            <OpenBukStudio />
          </React.Suspense>
        </RequireSurface>
      }
    />
    <Route element={<AppShell />}>
      <Route path="/apps" element={<BackofficeDirectory />} />
      <Route path="/freelancer/settings" element={<FreelancerSettings />} />
      {["/crm/assistant", "/crm/assistant/t/:threadId"].map((path) => (
        <Route
          key={path}
          path={path}
          element={
            <RequireSurface surfaces={["platform", "crm"]}>
              <AssistantPage basePath="/crm/assistant" activeModule="crm" />
            </RequireSurface>
          }
        />
      ))}
      <Route element={<SignWorkspace />}>
        {["/sign", "/sign/settings"].map((path) => (
          <Route key={path} path={path} element={<SignOverviewPage />} />
        ))}
        {["/sign/requests", "/sign/requests/:id"].map((path) => (
          <Route key={path} path={path} element={<SignRequestPage />} />
        ))}
        {[
          "/sign/requests/new",
          "/sign/templates",
          "/sign/templates/new",
          "/sign/templates/:id",
          "/sign/templates/:id/edit",
        ].map((path) => (
          <Route key={path} path={path} element={<SignTemplateEditor />} />
        ))}
      </Route>
      <Route path="/onboarding" element={<WorkspaceOnboardingPage />} />
      <Route
        path="/tasks"
        element={<DailyWorkPage getCreationGuidance={getTaskCreationGuidance} />}
      />
      <Route path="/tasks/templates" element={<DailyWorkPage templates />} />
      <Route path="/people/me" element={<StaffJourneyPage />} />
      <Route path="/people/staff/:id/lifecycle" element={<StaffJourneyPage manager />} />
      <Route path="/people/staff" element={<PeopleDirectoryPage />} />
      <Route path="/people/staff/new" element={<StaffProfilePage />} />
      <Route path="/people/staff/:id" element={<StaffProfilePage />} />
      <Route path="/people/staff/:id/edit" element={<StaffProfilePage />} />
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
      {restaurantRoutes}
      {websiteRoutes}
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
      {portfolioRoutes}
      <Route path="/forms" element={<FormsPage />} />
      <Route path="/forms/new" element={<NewFormPage />} />
      <Route path="/forms/:id" element={<FormDetailPage />} />
      <Route path="/issues" element={<IssuesListPage />} />
      {classRoutes}
      <Route path="/issues/submit" element={<SubmitRequestPage />} />
      <Route path="/issues/new" element={<NewIssuePage />} />
      <Route path="/issues/:id" element={<IssueDetailPage />} />
      <Route path="/expenses" element={<ExpensesPage />} />
      <Route path="/expenses/receipt-inbox" element={<ReceiptInboxPage />} />
      <Route path="/expenses/new" element={<NewExpensePage />} />
      <Route path="/expenses/:id" element={<ExpenseDetailPage />} />
      <Route path="/expenses/:id/edit" element={<NewExpensePage />} />
      <Route
        path="/cash/*"
        element={
          <RequireSurface surfaces={["platform", "pos"]}>
            <CashLayout />
          </RequireSurface>
        }
      />
      {posAdminRoutes().map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={<RequireSurface surfaces={["pos"]}>{route.element}</RequireSurface>}
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
            <CashLegacyRedirect dayClose />
          </RequireSurface>
        }
      />
      <Route
        path="/pos/nails/service-board"
        element={
          <RequireSurface surfaces={["pos"]}>
            <PosPackPlaceholderPage
              title="Nails Service Board"
              description="Vertical-specific POS pack entry point for technician flow and service-board operations."
            />
          </RequireSurface>
        }
      />
      <Route
        path="/pos/nails/appointments"
        element={
          <RequireSurface surfaces={["pos"]}>
            <PosPackPlaceholderPage
              title="Nails Appointments"
              description="Vertical-specific POS pack entry point for appointments and front-desk scheduling."
            />
          </RequireSurface>
        }
      />
      <Route
        path="/pos/retail/quick-sale"
        element={
          <RequireSurface surfaces={["pos"]}>
            <PosPackPlaceholderPage
              title="Retail Quick Sale"
              description="Vertical-specific POS pack entry point for fast checkout and barcode-led selling."
            />
          </RequireSurface>
        }
      />
      <Route
        path="/pos/retail/catalog"
        element={
          <RequireSurface surfaces={["pos"]}>
            <PosPackPlaceholderPage
              title="Retail Catalog Lookup"
              description="Vertical-specific POS pack entry point for catalog and item lookup on the retail surface."
            />
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
      {customerRoutes}
      <Route path="/students/new" element={<NewStudentPage />} />
      {crmRoutes}
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
      <Route path="/tax/annual" element={<TaxAnnualAssistantPage />} />
      <Route path="/tax/annual/t/:threadId" element={<TaxAnnualAssistantPage />} />
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
