export const DIRECTORY_PUBLIC_POLICIES = {
  cacheControl: "public, max-age=60, s-maxage=300, stale-while-revalidate=120",
} as const;

export const DIRECTORY_PERMISSIONS = {
  manageRestaurants: "directory.restaurants.manage",
} as const;
