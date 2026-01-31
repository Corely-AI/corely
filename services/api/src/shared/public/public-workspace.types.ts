export type PublicWorkspaceResolutionMethod = "custom-domain" | "subdomain" | "path" | "query";

export type PublicModuleKey = "cms" | "rentals" | "portfolio" | "marketplace";

export type PublicWorkspaceModules = Partial<Record<PublicModuleKey, boolean>>;

export type PublicWorkspaceContext = {
  tenantId: string;
  workspaceId: string;
  workspaceSlug: string;
  resolutionMethod: PublicWorkspaceResolutionMethod;
  publicEnabled: boolean;
  publicModules?: PublicWorkspaceModules | null;
};

export type PublicWorkspaceMetadata = {
  workspaceSlug: string;
  resolutionMethod: PublicWorkspaceResolutionMethod;
  publicEnabled: boolean;
  publicModules?: PublicWorkspaceModules | null;
};

export const PUBLIC_CONTEXT_METADATA_KEY = "public" as const;
