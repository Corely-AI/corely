import type {
  AdminDirectoryRestaurant,
  AdminDirectoryRestaurantListItem,
  DirectoryPriceRange,
  DirectoryRestaurant,
  DirectoryRestaurantListItem,
} from "@corely/contracts";
import type { DirectoryRestaurant as DirectoryRestaurantEntity } from "../domain/directory.types";

const DIRECTORY_PRICE_RANGES: readonly DirectoryPriceRange[] = ["$", "$$", "$$$", "$$$$"];

const toPriceRange = (value: string | null): DirectoryPriceRange | null => {
  if (!value) {
    return null;
  }

  return DIRECTORY_PRICE_RANGES.includes(value as DirectoryPriceRange)
    ? (value as DirectoryPriceRange)
    : null;
};

export const toDirectoryRestaurantListItem = (
  restaurant: DirectoryRestaurantEntity
): DirectoryRestaurantListItem => ({
  id: restaurant.id,
  slug: restaurant.slug,
  name: restaurant.name,
  shortDescription: restaurant.shortDescription,
  dishTags: restaurant.dishTags,
  neighborhoodSlug: restaurant.neighborhoodSlug,
  addressLine: restaurant.addressLine,
  postalCode: restaurant.postalCode,
  city: restaurant.city,
  priceRange: toPriceRange(restaurant.priceRange),
  status: restaurant.status,
});

export const toDirectoryRestaurantDto = (
  restaurant: DirectoryRestaurantEntity
): DirectoryRestaurant => ({
  id: restaurant.id,
  slug: restaurant.slug,
  name: restaurant.name,
  shortDescription: restaurant.shortDescription,
  phone: restaurant.phone,
  website: restaurant.website,
  priceRange: toPriceRange(restaurant.priceRange),
  dishTags: restaurant.dishTags,
  neighborhoodSlug: restaurant.neighborhoodSlug,
  addressLine: restaurant.addressLine,
  postalCode: restaurant.postalCode,
  city: restaurant.city,
  lat: restaurant.lat,
  lng: restaurant.lng,
  openingHours: restaurant.openingHoursJson,
  status: restaurant.status,
  createdAt: restaurant.createdAt.toISOString(),
  updatedAt: restaurant.updatedAt.toISOString(),
});

export const toAdminDirectoryRestaurantListItem = (
  restaurant: DirectoryRestaurantEntity
): AdminDirectoryRestaurantListItem => ({
  id: restaurant.id,
  slug: restaurant.slug,
  name: restaurant.name,
  dishTags: restaurant.dishTags,
  neighborhoodSlug: restaurant.neighborhoodSlug,
  status: restaurant.status,
  updatedAt: restaurant.updatedAt.toISOString(),
});

export const toAdminDirectoryRestaurantDto = (
  restaurant: DirectoryRestaurantEntity
): AdminDirectoryRestaurant => ({
  id: restaurant.id,
  slug: restaurant.slug,
  name: restaurant.name,
  shortDescription: restaurant.shortDescription,
  phone: restaurant.phone,
  website: restaurant.website,
  priceRange: toPriceRange(restaurant.priceRange),
  dishTags: restaurant.dishTags,
  neighborhoodSlug: restaurant.neighborhoodSlug,
  addressLine: restaurant.addressLine,
  postalCode: restaurant.postalCode,
  city: restaurant.city,
  lat: restaurant.lat,
  lng: restaurant.lng,
  openingHoursJson: restaurant.openingHoursJson,
  status: restaurant.status,
  createdAt: restaurant.createdAt.toISOString(),
  updatedAt: restaurant.updatedAt.toISOString(),
});
