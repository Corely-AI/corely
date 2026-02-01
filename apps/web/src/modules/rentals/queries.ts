import { createCrudQueryKeys } from "@/shared/crud";
import type { ListRentalPropertiesInput, ListPublicRentalPropertiesInput } from "@corely/contracts";

export const rentalPropertyKeys = createCrudQueryKeys("rentals/properties");
export const rentalCategoryKeys = createCrudQueryKeys("rentals/categories");

export const rentalsPublicKeys = {
  properties: (workspaceSlug?: string | null, params?: ListPublicRentalPropertiesInput) => [
    "rentals/public",
    workspaceSlug ?? "unknown",
    "properties",
    params ?? {},
  ],
  property: (workspaceSlug?: string | null, slug?: string) => [
    "rentals/public",
    workspaceSlug ?? "unknown",
    "property",
    slug ?? "",
  ],
  categories: (workspaceSlug?: string | null) => [
    "rentals/public",
    workspaceSlug ?? "unknown",
    "categories",
  ],
  availability: (
    workspaceSlug: string | null | undefined,
    slug: string,
    from: string,
    to: string
  ) => ["rentals/public/availability", workspaceSlug ?? "unknown", slug, from, to],
  adminList: (params?: ListRentalPropertiesInput) => ["rentals/admin/properties", params ?? {}],
};
