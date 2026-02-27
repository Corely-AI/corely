export type DirectoryRestaurantStatus = "ACTIVE" | "HIDDEN";
export type DirectoryLeadStatus = "NEW" | "CONTACTED" | "CLOSED";
export type DirectoryPriceRange = "$" | "$$" | "$$$" | "$$$$";

export type DirectoryOpeningHours = Record<string, string[]>;

export type DirectoryRestaurant = {
  id: string;
  tenantId: string;
  workspaceId: string;
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
  createdAt: Date;
  updatedAt: Date;
};

export type DirectoryLead = {
  id: string;
  tenantId: string;
  workspaceId: string;
  restaurantId: string;
  name: string;
  contact: string;
  message: string;
  status: DirectoryLeadStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type DirectoryScope = {
  tenantId: string;
  workspaceId: string;
};
