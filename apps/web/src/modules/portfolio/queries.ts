import type {
  ListPortfolioClientsInput,
  ListPortfolioProjectsInput,
  ListPortfolioServicesInput,
  ListPortfolioShowcasesInput,
  ListPortfolioTeamMembersInput,
} from "@corely/contracts";

export const portfolioKeys = {
  showcases: {
    list: (params?: ListPortfolioShowcasesInput) =>
      ["portfolio", "showcases", "list", params ?? {}] as const,
    detail: (id: string) => ["portfolio", "showcases", id] as const,
    profile: (showcaseId: string) => ["portfolio", "profiles", showcaseId] as const,
  },
  projects: {
    list: (showcaseId: string, params?: ListPortfolioProjectsInput) =>
      ["portfolio", "projects", "list", showcaseId, params ?? {}] as const,
    detail: (id: string) => ["portfolio", "projects", id] as const,
  },
  clients: {
    list: (showcaseId: string, params?: ListPortfolioClientsInput) =>
      ["portfolio", "clients", "list", showcaseId, params ?? {}] as const,
    detail: (id: string) => ["portfolio", "clients", id] as const,
  },
  services: {
    list: (showcaseId: string, params?: ListPortfolioServicesInput) =>
      ["portfolio", "services", "list", showcaseId, params ?? {}] as const,
    detail: (id: string) => ["portfolio", "services", id] as const,
  },
  team: {
    list: (showcaseId: string, params?: ListPortfolioTeamMembersInput) =>
      ["portfolio", "team", "list", showcaseId, params ?? {}] as const,
    detail: (id: string) => ["portfolio", "team", id] as const,
  },
};
