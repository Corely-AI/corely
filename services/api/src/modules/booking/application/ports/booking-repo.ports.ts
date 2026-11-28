import type {
  BookingResource,
  BookingAllocation,
  BookingEntity,
  BookingHold,
  ServiceOffering,
  AvailabilityRule,
} from "../../domain/booking.entities";
import type { TransactionContext } from "@corely/kernel";

// ─── Resource Repository ──────────────────────────────────────────────────────

export interface ResourceFilters {
  workspaceId?: string;
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
  findById(id: string, tenantId: string, tx?: TransactionContext): Promise<BookingResource | null>;
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
  workspaceId?: string;
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
  lockResource(tenantId: string, resourceId: string, tx: TransactionContext): Promise<void>;
  upsert(rule: AvailabilityRule, tx?: TransactionContext): Promise<AvailabilityRule>;
  findByResourceId(
    resourceId: string,
    tenantId: string,
    tx?: TransactionContext
  ): Promise<AvailabilityRule | null>;
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
  /** Recheck availability and, when holdId is set, consume the active hold atomically. */
  create(
    booking: BookingEntity,
    allocations: BookingAllocation[],
    tx?: TransactionContext
  ): Promise<BookingEntity>;
  findById(id: string, tenantId: string, tx?: TransactionContext): Promise<BookingEntity | null>;
  lockMutation(tenantId: string, key: string, tx: TransactionContext): Promise<void>;
  mutationReceipt(
    tenantId: string,
    action: string,
    key: string,
    fingerprint: string,
    tx: TransactionContext
  ): Promise<BookingEntity | null>;
  saveMutationReceipt(
    booking: BookingEntity,
    action: string,
    key: string,
    fingerprint: string,
    tx: TransactionContext
  ): Promise<void>;
  findMany(
    tenantId: string,
    filters: BookingFilters,
    page: number,
    pageSize: number
  ): Promise<BookingPage>;
  update(booking: BookingEntity, tx: TransactionContext): Promise<BookingEntity>;
  /** Replace all allocations for a booking inside the same tx */
  replaceAllocations(
    bookingId: string,
    tenantId: string,
    allocations: BookingAllocation[],
    tx: TransactionContext
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
  create(hold: BookingHold, tx?: TransactionContext): Promise<BookingHold>;
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
