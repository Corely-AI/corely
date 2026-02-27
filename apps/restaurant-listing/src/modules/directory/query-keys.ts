import type { DirectoryRestaurantListQuery } from "@corely/contracts";

export const directoryQueryKeys = {
  list: (params: DirectoryRestaurantListQuery) => ["directory", "restaurants", params] as const,
  detail: (slug: string) => ["directory", "restaurant", slug] as const,
};
