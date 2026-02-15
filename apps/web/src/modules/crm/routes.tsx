import DealsPage from "./screens/DealsPage";
import NewDealPage from "./screens/NewDealPage";
import DealDetailPage from "./screens/DealDetailPage";
import ActivitiesPage from "./screens/ActivitiesPage";
import NewActivityPage from "./screens/NewActivityPage";
import LeadsPage from "./screens/LeadsPage";
import NewLeadPage from "./screens/NewLeadPage";
import LeadDetailPage from "./screens/LeadDetailPage";
import SequencesPage from "./screens/SequencesPage";

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
    path: "/crm/sequences",
    element: <SequencesPage />,
  },
];
