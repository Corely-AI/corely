import type {
  BookingResource,
  BookingAllocation,
  BookingEntity,
  BookingHold,
  ServiceOffering,
  AvailabilityRule,
} from "../../domain/booking.entities";

// ─── Resource Repository ──────────────────────────────────────────────────────

export interface ResourceFilters {
  type?: string;
  isActive?: boolean;
  q?: string;
}

export interface ResourcePage {
  items: BookingResource[];
  total: number;
}

export interface ResourceRepositoryPort {
  create(resource: BookingResource): Promise<BookingResource>;
  findById(id: string, tenantId: string): Promise<BookingResource | null>;
  findMany(
    tenantId: string,
    filters: ResourceFilters,
    page: number,
    pageSize: number
  ): Promise<ResourcePage>;
  update(resource: BookingResource): Promise<BookingResource>;
  delete(id: string, tenantId: string): Promise<void>;
}

export const RESOURCE_REPOSITORY = "booking/resource-repository";

// ─── Service Offering Repository ──────────────────────────────────────────────

export interface ServiceFilters {
  q?: string;
  isActive?: boolean;
}

export interface ServicePage {
  items: ServiceOffering[];
  total: number;
}

export interface ServiceRepositoryPort {
  create(service: ServiceOffering): Promise<ServiceOffering>;
  findById(id: string, tenantId: string): Promise<ServiceOffering | null>;
  findMany(
    tenantId: string,
    filters: ServiceFilters,
    page: number,
    pageSize: number
  ): Promise<ServicePage>;
  update(service: ServiceOffering): Promise<ServiceOffering>;
  delete(id: string, tenantId: string): Promise<void>;
}

export const SERVICE_REPOSITORY = "booking/service-repository";

// ─── Availability Rule Repository ─────────────────────────────────────────────

export interface AvailabilityRuleRepositoryPort {
  upsert(rule: AvailabilityRule): Promise<AvailabilityRule>;
  findByResourceId(resourceId: string, tenantId: string): Promise<AvailabilityRule | null>;
}

export const AVAILABILITY_RULE_REPOSITORY = "booking/availability-rule-repository";

// ─── Booking Repository ───────────────────────────────────────────────────────

export interface BookingFilters {
  q?: string;
  status?: string;
  resourceId?: string;
  serviceOfferingId?: string;
  fromDate?: Date;
  toDate?: Date;
  bookedByPartyId?: string;
}

export interface BookingPage {
  items: BookingEntity[];
  total: number;
}

export interface BookingRepositoryPort {
  create(booking: BookingEntity, allocations: BookingAllocation[]): Promise<BookingEntity>;
  findById(id: string, tenantId: string): Promise<BookingEntity | null>;
  findMany(
    tenantId: string,
    filters: BookingFilters,
    page: number,
    pageSize: number
  ): Promise<BookingPage>;
  update(booking: BookingEntity): Promise<BookingEntity>;
  /** Replace all allocations for a booking inside the same tx */
  replaceAllocations(
    bookingId: string,
    tenantId: string,
    allocations: BookingAllocation[]
  ): Promise<void>;
  /**
   * Returns true if any CONFIRMED/HOLD booking already has an allocation for
   * the given resource overlapping [startAt, endAt).
   * Used inside a transaction to prevent double-booking.
   */
  hasConflict(
    tenantId: string,
    resourceId: string,
    startAt: Date,
    endAt: Date,
    excludeBookingId?: string
  ): Promise<boolean>;
}

export const BOOKING_REPOSITORY = "booking/booking-repository";

// ─── Hold Repository ──────────────────────────────────────────────────────────

export interface HoldRepositoryPort {
  create(hold: BookingHold): Promise<BookingHold>;
  findById(id: string, tenantId: string): Promise<BookingHold | null>;
  update(hold: BookingHold): Promise<BookingHold>;
  hasActiveOverlap(
    tenantId: string,
    resourceId: string,
    startAt: Date,
    endAt: Date,
    now: Date
  ): Promise<boolean>;
  expireStaleHolds(tenantId: string): Promise<number>;
}

export const HOLD_REPOSITORY = "booking/hold-repository";
