import { BadRequestException } from "@nestjs/common";
import { validateNewBooking, type BookingPolicyRegistration } from "@corely/booking/extensions";

export const BOOKING_POLICIES = Symbol("BOOKING_POLICIES");

export function enforceBookingPolicy(
  registrations: readonly BookingPolicyRegistration[],
  scope: { tenantId: string; workspaceId?: string | null },
  startAt: Date,
  endAt: Date,
  now: Date
): void {
  const rejection = validateNewBooking(registrations, scope, {
    startAtMs: startAt.getTime(),
    endAtMs: endAt.getTime(),
    nowMs: now.getTime(),
  });
  if (rejection) {
    throw new BadRequestException({ code: "Booking:PolicyRejected", message: rejection.message });
  }
}
