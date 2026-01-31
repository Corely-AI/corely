import { createCrudQueryKeys } from "@/shared/crud";
import type { ListRentalPropertiesInput, ListPublicRentalPropertiesInput } from "@corely/contracts";

export const rentalPropertyKeys = createCrudQueryKeys("rentals/properties");

export const rentalsPublicKeys = {
  properties: (params?: ListPublicRentalPropertiesInput) => [
    "rentals/public",
    "properties",
    params ?? {},
  ],
  property: (slug?: string) => ["rentals/public", "property", slug ?? ""],
  availability: (slug: string, from: string, to: string) => [
    "rentals/public/availability",
    slug,
    from,
    to,
  ],
  adminList: (params?: ListRentalPropertiesInput) => ["rentals/admin/properties", params ?? {}],
};
