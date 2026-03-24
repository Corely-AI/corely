import React from "react";
import { Navigate, Route } from "react-router-dom";
import { RequirePermission, RequireSurface } from "@corely/web-shared/shared/permissions";
import {
  BirthdayRemindersPage,
  CustomersPage,
  EditCustomerPage,
  EditSupplierPage,
  NewCustomerPage,
  NewSupplierPage,
  StudentDetailPage,
  StudentsPage,
  SuppliersPage,
} from "../../modules/customers";
import {
  ClassGroupDetailPage,
  ClassGroupEditorPage,
  ClassGroupsListPage,
  ClassesBillingPage,
  CohortDetailScreen,
  CohortsListScreen,
  ProgramDetailScreen,
  ProgramsListScreen,
  SessionDetailPage,
  SessionsPage,
} from "../../modules/classes";
import {
  AccountDetailPage,
  AccountFormPage,
  AccountsPage,
  ActivitiesPage,
  ContactDetailPage,
  ContactFormPage,
  ContactsPage,
  CrmDashboardPage,
  CrmEmailSettingsPage,
  DealDetailPage,
  DealsPage,
  LeadDetailPage,
  LeadsPage,
  NewActivityPage,
  NewDealPage,
  NewSequencePage,
  SequencesPage,
  SequenceDetailPage,
} from "../../modules/crm";
import {
  RestaurantCopilotPage,
  RestaurantFloorPlanPage,
  RestaurantKitchenQueuePage,
  RestaurantKitchenStationsPage,
  RestaurantModifierGroupsPage,
} from "../../modules/restaurant";
import {
  ClientEditorPage,
  ClientsPage,
  ProjectEditorPage,
  ProjectsPage,
  ServiceEditorPage,
  ServicesPage,
  ShowcaseEditorPage,
  ShowcaseProfilePage,
  ShowcasesPage,
  TeamEditorPage,
  TeamPage,
} from "../../modules/portfolio";
import {
  WebsiteDomainsPage,
  WebsiteFeedbackConfigPage,
  WebsiteMenusPage,
  WebsitePageEditorPage,
  WebsitePagesPage,
  WebsiteSitesPage,
  WebsiteSiteEditorPage,
  WebsiteWallOfLovePage,
} from "../../modules/website";

export const restaurantRoutes = (
  <>
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
  </>
);

export const websiteRoutes = (
  <>
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
  </>
);

export const portfolioRoutes = (
  <>
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
  </>
);

export const classRoutes = (
  <>
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
  </>
);

export const customerRoutes = (
  <>
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
    <Route path="/students/:id" element={<StudentDetailPage />} />
    <Route path="/students/:id/edit" element={<StudentDetailPage />} />
  </>
);

export const crmRoutes = (
  <>
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
  </>
);
