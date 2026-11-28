import type { StaffAvailability, StaffCommitment, StaffLinkScope } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
export interface StaffAvailabilityRepository {
  get(scope: StaffLinkScope, staffId: string, tx?: TransactionContext): Promise<StaffAvailability>;
  save(
    scope: StaffLinkScope,
    staffId: string,
    value: StaffAvailability,
    tx: TransactionContext
  ): Promise<void>;
}
// Booking owns locking and commitment facts. No customer/absence data crosses this port.
export interface StaffBookingPort {
  lock(scope: StaffLinkScope, resourceIds: string[], tx: TransactionContext): Promise<void>;
  commitments(
    scope: StaffLinkScope,
    resourceId: string,
    from: Date,
    tx?: TransactionContext
  ): Promise<StaffCommitment[]>;
}
export const STAFF_AVAILABILITY_REPOSITORY = Symbol("STAFF_AVAILABILITY_REPOSITORY");
export const STAFF_BOOKING = Symbol("STAFF_BOOKING");
