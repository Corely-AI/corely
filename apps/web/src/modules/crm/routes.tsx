import DealsPage from "./screens/DealsPage";
import NewDealPage from "./screens/NewDealPage";
import DealDetailPage from "./screens/DealDetailPage";
import ActivitiesPage from "./screens/ActivitiesPage";
import NewActivityPage from "./screens/NewActivityPage";
import LeadsPage from "./screens/LeadsPage";
import NewLeadPage from "./screens/NewLeadPage";
import LeadDetailPage from "./screens/LeadDetailPage";
import SequencesPage from "./screens/SequencesPage";
import NewSequencePage from "./screens/NewSequencePage";
import ContactsPage from "./screens/ContactsPage";
import ContactFormPage from "./screens/ContactFormPage";
import ContactDetailPage from "./screens/ContactDetailPage";
import AccountsPage from "./screens/AccountsPage";
import AccountDetailPage from "./screens/AccountDetailPage";
import AccountFormPage from "./screens/AccountFormPage";

export const crmRoutes = [
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
