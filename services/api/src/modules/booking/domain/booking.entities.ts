// ─── Booking Domain Entities & Types ──────────────────────────────────────────

export type BookingStatus = "DRAFT" | "HOLD" | "CONFIRMED" | "CANCELLED" | "NO_SHOW" | "COMPLETED";

export type ResourceType = "STAFF" | "ROOM" | "EQUIPMENT";

export type AllocationRole = "PRIMARY" | "SUPPORT" | "ROOM" | "EQUIPMENT";

export type BookingHoldStatus = "ACTIVE" | "CONFIRMED" | "EXPIRED" | "CANCELLED";

// ─── Valid status transitions ─────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  DRAFT: ["CONFIRMED", "CANCELLED"],
  HOLD: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CANCELLED", "NO_SHOW", "COMPLETED"],
  CANCELLED: [],
  NO_SHOW: [],
  COMPLETED: [],
};

// Expose as EXPIRED via domain for holds but keep Booking transitions clean
const BOOKING_VALID: Record<BookingStatus, BookingStatus[]> = VALID_TRANSITIONS;

export function assertValidStatusTransition(current: BookingStatus, next: BookingStatus): void {
  if (!BOOKING_VALID[current].includes(next)) {
    throw new Error(`Invalid booking status transition: ${current} → ${next}`);
  }
}

// ─── Resource Entity ──────────────────────────────────────────────────────────

export class BookingResource {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly workspaceId: string | null,
    public type: ResourceType,
    public name: string,
    public description: string | null,
    public location: string | null,
    public capacity: number | null,
    public tags: string[],
    public attributes: Record<string, unknown> | null,
    public isActive: boolean,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}

  update(
    data: Partial<{
      type: ResourceType;
      name: string;
      description: string | null;
      location: string | null;
      capacity: number | null;
      tags: string[];
      attributes: Record<string, unknown> | null;
      isActive: boolean;
    }>
  ) {
    if (data.type !== undefined) {
      this.type = data.type;
    }
    if (data.name !== undefined) {
      this.name = data.name;
    }
    if (data.description !== undefined) {
      this.description = data.description;
    }
    if (data.location !== undefined) {
      this.location = data.location;
    }
    if (data.capacity !== undefined) {
      this.capacity = data.capacity;
    }
    if (data.tags !== undefined) {
      this.tags = data.tags;
    }
    if (data.attributes !== undefined) {
      this.attributes = data.attributes;
    }
    if (data.isActive !== undefined) {
      this.isActive = data.isActive;
    }
    this.updatedAt = new Date();
  }
}

// ─── Service Offering Entity ──────────────────────────────────────────────────

export class ServiceOffering {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly workspaceId: string | null,
    public name: string,
    public description: string | null,
    public durationMinutes: number,
    public bufferBeforeMinutes: number,
    public bufferAfterMinutes: number,
    public priceCents: number | null,
    public currency: string | null,
    public depositCents: number | null,
    public requiredResourceTypes: ResourceType[],
    public requiredTags: string[],
    public isActive: boolean,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}

  /** Total slot time including buffers */
  get totalSlotMinutes(): number {
    return this.bufferBeforeMinutes + this.durationMinutes + this.bufferAfterMinutes;
  }

  update(
    data: Partial<{
      name: string;
      description: string | null;
      durationMinutes: number;
      bufferBeforeMinutes: number;
      bufferAfterMinutes: number;
      priceCents: number | null;
      currency: string | null;
      depositCents: number | null;
      requiredResourceTypes: ResourceType[];
      requiredTags: string[];
      isActive: boolean;
    }>
  ) {
    Object.assign(this, data);
    this.updatedAt = new Date();
  }
}

// ─── Availability Rule Entity ─────────────────────────────────────────────────

export interface WeeklyScheduleSlot {
  dayOfWeek: number; // 0=Sun … 6=Sat
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

export interface BlackoutInterval {
  startAt: Date;
  endAt: Date;
  reason?: string | null;
}

export class AvailabilityRule {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly resourceId: string,
    public timezone: string,
    public weeklySlots: WeeklyScheduleSlot[],
    public blackouts: BlackoutInterval[],
    public effectiveFrom: Date | null,
    public effectiveTo: Date | null,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}

  /**
   * Returns true if the given UTC interval overlaps a blackout.
   */
  isBlackedOut(startAt: Date, endAt: Date): boolean {
    return this.blackouts.some((b) => b.startAt < endAt && b.endAt > startAt);
  }
}

// ─── Booking Allocation Entity ────────────────────────────────────────────────

export class BookingAllocation {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly bookingId: string,
    public readonly resourceId: string,
    public role: AllocationRole,
    public startAt: Date,
    public endAt: Date,
    public readonly createdAt: Date
  ) {}
}

// ─── Booking Hold Entity ──────────────────────────────────────────────────────

export class BookingHold {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly workspaceId: string | null,
    public status: BookingHoldStatus,
    public readonly startAt: Date,
    public readonly endAt: Date,
    public readonly serviceOfferingId: string | null,
    public readonly resourceIds: string[],
    public readonly expiresAt: Date,
    public bookedByPartyId: string | null,
    public bookedByName: string | null,
    public bookedByEmail: string | null,
    public notes: string | null,
    public confirmedBookingId: string | null,
    public readonly createdByUserId: string | null,
    public readonly createdAt: Date
  ) {}

  get isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  /** Effective status — treat as EXPIRED if past TTL */
  get effectiveStatus(): BookingHoldStatus {
    if (this.status === "ACTIVE" && this.isExpired) {
      return "EXPIRED";
    }
    return this.status;
  }

  confirm(bookingId: string): void {
    if (this.effectiveStatus !== "ACTIVE") {
      throw new Error(`Hold ${this.id} cannot be confirmed — status is ${this.effectiveStatus}`);
    }
    this.status = "CONFIRMED";
    this.confirmedBookingId = bookingId;
  }

  expire(): void {
    this.status = "EXPIRED";
  }
}

// ─── Booking Entity ───────────────────────────────────────────────────────────

export class BookingEntity {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly workspaceId: string | null,
    public status: BookingStatus,
    public startAt: Date,
    public endAt: Date,
    public readonly referenceNumber: string | null,
    public readonly serviceOfferingId: string | null,
    public bookedByPartyId: string | null,
    public bookedByName: string | null,
    public bookedByEmail: string | null,
    public notes: string | null,
    public readonly holdId: string | null,
    public cancelledAt: Date | null,
    public cancelledReason: string | null,
    public readonly createdByUserId: string | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public allocations: BookingAllocation[] = []
  ) {}

  confirm(): void {
    assertValidStatusTransition(this.status, "CONFIRMED");
    this.status = "CONFIRMED";
    this.updatedAt = new Date();
  }

  cancel(reason?: string | null): void {
    assertValidStatusTransition(this.status, "CANCELLED");
    this.status = "CANCELLED";
    this.cancelledAt = new Date();
    this.cancelledReason = reason ?? null;
    this.updatedAt = new Date();
  }

  complete(): void {
    assertValidStatusTransition(this.status, "COMPLETED");
    this.status = "COMPLETED";
    this.updatedAt = new Date();
  }

  reschedule(startAt: Date, endAt: Date): void {
    if (startAt >= endAt) {
      throw new Error("startAt must be before endAt");
    }
    if (!["DRAFT", "CONFIRMED"].includes(this.status)) {
      throw new Error(`Cannot reschedule booking in status ${this.status}`);
    }
    this.startAt = startAt;
    this.endAt = endAt;
    this.updatedAt = new Date();
    // Allocations must be re-created by the use case after conflict check
    this.allocations = [];
  }

  updateDetails(
    data: Partial<{
      bookedByPartyId: string | null;
      bookedByName: string | null;
      bookedByEmail: string | null;
      notes: string | null;
    }>
  ) {
    Object.assign(this, data);
    this.updatedAt = new Date();
  }
}
