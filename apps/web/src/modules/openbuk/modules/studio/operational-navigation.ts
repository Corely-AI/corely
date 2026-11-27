import type { OperationalExperienceId, OperationalPackage } from "@corely/contracts";

const routes = {
  schedule: "/app",
  team: "/app/me",
  "daily-work": "/app/tasks",
  decisions: "/app/decisions",
  knowledge: "/app/knowledge",
} as const satisfies Record<OperationalExperienceId, string>;

export type StudioSection = OperationalExperienceId | "settings" | "unknown";

export function getStudioSection(pathname: string, prefix: string): StudioSection {
  const route = pathname.slice(prefix.length).replace(/\/+$/, "");
  switch (route) {
    case "/app":
    case "/app/calendar":
      return "schedule";
    case "/app/me":
      return "team";
    case "/app/tasks":
    case "/app/tasks/templates":
      return "daily-work";
    case "/app/settings":
      return "settings";
    case "/app/decisions":
      return "decisions";
    case "/app/knowledge":
      return "knowledge";
    default:
      return "unknown";
  }
}

// Owner routes can be handed off only from the Backoffice-hosted OpenBuk client.
const ownerRoutes: Partial<Record<OperationalExperienceId, string>> = {
  decisions: "/requests/inbox",
  knowledge: "/knowledge",
};

export function getOperationalLinks(operationalPackage: OperationalPackage | null, prefix: string) {
  return (operationalPackage?.experiences ?? []).flatMap(({ id, availability }) => {
    if (availability.status !== "available") {
      return [];
    }
    const route = routes[id];
    const ownerRoute = ownerRoutes[id];
    if (ownerRoute) {
      return prefix === "/openbuk" && availability.route === ownerRoute
        ? [{ id, href: prefix + route, ownerRoute }]
        : [];
    }
    if (availability.route !== route && availability.route !== "/openbuk" + route) {
      return [];
    }
    return [{ id, href: prefix + route, ownerRoute: undefined }];
  });
}
