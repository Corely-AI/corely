import type {
  AdminDirectoryRestaurantListQuery,
  DirectoryRestaurantStatus,
  DirectoryRestaurantListQuery,
} from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import type {
  DirectoryLead,
  DirectoryOpeningHours,
  DirectoryRestaurant,
  DirectoryScope,
} from "../../domain/directory.types";

export type LeadRestaurantRef = {
  restaurantId?: string;
  restaurantSlug?: string;
};

export type DirectoryRestaurantListResult = {
  items: DirectoryRestaurant[];
  total: number;
};

export type DirectoryLeadCreateInput = {
  scope: DirectoryScope;
  restaurantId: string;
  name: string;
  contact: string;
  message: string;
};

export type AdminDirectoryRestaurantListResult = {
  items: DirectoryRestaurant[];
  total: number;
};

export type AdminDirectoryRestaurantCreateInput = {
  scope: DirectoryScope;
  slug: string;
  name: string;
  shortDescription: string | null;
  phone: string | null;
  website: string | null;
  priceRange: string | null;
  dishTags: string[];
  neighborhoodSlug: string | null;
  addressLine: string;
  postalCode: string;
  city: string;
  lat: number | null;
  lng: number | null;
  openingHoursJson: DirectoryOpeningHours | null;
  status: DirectoryRestaurantStatus;
};

export type AdminDirectoryRestaurantUpdateInput = {
  scope: DirectoryScope;
  id: string;
  patch: Partial<Omit<AdminDirectoryRestaurantCreateInput, "scope">>;
};

export interface DirectoryRepositoryPort {
  listRestaurants(
    scope: DirectoryScope,
    query: DirectoryRestaurantListQuery
  ): Promise<DirectoryRestaurantListResult>;
  listAdminRestaurants(
    scope: DirectoryScope,
    query: AdminDirectoryRestaurantListQuery
  ): Promise<AdminDirectoryRestaurantListResult>;
  getRestaurantById(scope: DirectoryScope, id: string): Promise<DirectoryRestaurant | null>;
  findRestaurantBySlug(
    scope: DirectoryScope,
    slug: string,
    tx?: TransactionContext
  ): Promise<DirectoryRestaurant | null>;
  getRestaurantBySlug(scope: DirectoryScope, slug: string): Promise<DirectoryRestaurant | null>;
  findRestaurantForLead(
    scope: DirectoryScope,
    ref: LeadRestaurantRef,
    tx?: TransactionContext
  ): Promise<DirectoryRestaurant | null>;
  createRestaurant(
    input: AdminDirectoryRestaurantCreateInput,
    tx?: TransactionContext
  ): Promise<DirectoryRestaurant>;
  updateRestaurant(
    input: AdminDirectoryRestaurantUpdateInput,
    tx?: TransactionContext
  ): Promise<DirectoryRestaurant>;
  createLead(input: DirectoryLeadCreateInput, tx?: TransactionContext): Promise<DirectoryLead>;
}

export const DIRECTORY_REPOSITORY_PORT = "directory/repository";
