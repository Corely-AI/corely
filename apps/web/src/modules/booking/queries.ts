import { createCrudQueryKeys } from "@/shared/crud";

export const bookingResourceKeys = createCrudQueryKeys("booking/resources");
export const bookingServiceKeys = createCrudQueryKeys("booking/services");
export const bookingKeys = createCrudQueryKeys("booking/bookings");

// Separate non-CRUD keys for availability
export const availabilityKeys = {
  all: () => ["booking/availability"] as const,
  byResource: (resourceId: string, fromDt: string, toDt: string) =>
    [...availabilityKeys.all(), resourceId, fromDt, toDt] as const,
};
