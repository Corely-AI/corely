import { buildWorkspacePath } from "@/lib/urls";

export const ecommerceRoutes = {
  home: (workspaceSlug?: string | null) => buildWorkspacePath("/shop", workspaceSlug),
  collections: (workspaceSlug?: string | null) => buildWorkspacePath("/collections", workspaceSlug),
  collection: (categoryIdOrSlug: string, workspaceSlug?: string | null) =>
    buildWorkspacePath(`/collections/${categoryIdOrSlug}`, workspaceSlug),
  product: (itemId: string, workspaceSlug?: string | null) =>
    buildWorkspacePath(`/products/${itemId}`, workspaceSlug),
  checkout: (workspaceSlug?: string | null) => buildWorkspacePath("/checkout", workspaceSlug),
};
