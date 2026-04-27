import type { AppManifest } from "@corely/contracts";

export const nailsPosAppManifest: AppManifest = {
  appId: "nails",
  name: "Nails POS Pack",
  tier: 1,
  version: "1.0.0",
  description: "Appointments, service board, and checkout flows for nail salons",
  dependencies: [],
  allowedSurfaces: ["pos"],
  allowedVerticals: ["nails"],
  capabilities: [],
  permissions: [],
  menu: [
    {
      id: "nails-service-board",
      scope: "web",
      section: "pos",
      labelKey: "nav.nails.serviceBoard",
      defaultLabel: "Service Board",
      route: "/pos/nails/service-board",
      icon: "Sparkles",
      order: 10,
    },
    {
      id: "nails-appointments",
      scope: "web",
      section: "pos",
      labelKey: "nav.nails.appointments",
      defaultLabel: "Appointments",
      route: "/pos/nails/appointments",
      icon: "CalendarDays",
      order: 11,
    },
  ],
};
