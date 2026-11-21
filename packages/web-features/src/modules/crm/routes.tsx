import React from "react";
import { Navigate } from "react-router-dom";
const CrmDashboardPage = React.lazy(() => import("./screens/CrmDashboardPage"));
const DealsPage = React.lazy(() => import("./screens/DealsPage"));
const NewDealPage = React.lazy(() => import("./screens/NewDealPage"));
const DealDetailPage = React.lazy(() => import("./screens/DealDetailPage"));
const ActivitiesPage = React.lazy(() => import("./screens/ActivitiesPage"));
const NewActivityPage = React.lazy(() => import("./screens/NewActivityPage"));
const LeadsPage = React.lazy(() => import("./screens/LeadsPage"));
const NewLeadPage = React.lazy(() => import("./screens/NewLeadPage"));
const LeadDetailPage = React.lazy(() => import("./screens/LeadDetailPage"));
const SequencesPage = React.lazy(() => import("./screens/SequencesPage"));
const NewSequencePage = React.lazy(() => import("./screens/NewSequencePage"));
const SequenceDetailPage = React.lazy(() => import("./screens/SequenceDetailPage"));
const CrmEmailSettingsPage = React.lazy(() => import("./screens/CrmEmailSettingsPage"));
const ContactsPage = React.lazy(() => import("./screens/ContactsPage"));
const ContactFormPage = React.lazy(() => import("./screens/ContactFormPage"));
const ContactDetailPage = React.lazy(() => import("./screens/ContactDetailPage"));
const AccountsPage = React.lazy(() => import("./screens/AccountsPage"));
const AccountDetailPage = React.lazy(() => import("./screens/AccountDetailPage"));
const AccountFormPage = React.lazy(() => import("./screens/AccountFormPage"));

export const crmRoutes = [
  {
    path: "/crm",
    element: <CrmDashboardPage />,
  },
  {
    path: "/crm/overview",
    element: <Navigate to="/crm" replace />,
  },
  {
    path: "/crm/deals",
    element: <DealsPage />,
  },
  {
    path: "/crm/deals/new",
    element: <NewDealPage />,
  },
  {
    path: "/crm/deals/:id",
    element: <DealDetailPage />,
  },
  {
    path: "/crm/activities",
    element: <ActivitiesPage />,
  },
  {
    path: "/crm/activities/new",
    element: <NewActivityPage />,
  },
  {
    path: "/crm/leads",
    element: <LeadsPage />,
  },
  {
    path: "/crm/leads/new",
    element: <NewLeadPage />,
  },
  {
    path: "/crm/leads/:id",
    element: <LeadDetailPage />,
  },
  {
    path: "/crm/contacts",
    element: <ContactsPage />,
  },
  {
    path: "/crm/contacts/new",
    element: <ContactFormPage />,
  },
  {
    path: "/crm/contacts/:id",
    element: <ContactDetailPage />,
  },
  {
    path: "/crm/contacts/:id/edit",
    element: <ContactFormPage />,
  },
  {
    path: "/crm/sequences",
    element: <SequencesPage />,
  },
  {
    path: "/crm/sequences/new",
    element: <NewSequencePage />,
  },
  {
    path: "/crm/sequences/:id",
    element: <SequenceDetailPage />,
  },
  {
    path: "/crm/settings/email",
    element: <CrmEmailSettingsPage />,
  },
  { path: "/crm/deals/:id/edit", element: <DealDetailPage /> },
  // ── Account routes ──
  {
    path: "/crm/accounts",
    element: <AccountsPage />,
  },
  {
    path: "/crm/accounts/new",
    element: <AccountFormPage />,
  },
  {
    path: "/crm/accounts/:id",
    element: <AccountDetailPage />,
  },
  {
    path: "/crm/accounts/:id/edit",
    element: <AccountFormPage />,
  },
];
