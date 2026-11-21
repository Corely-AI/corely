export interface NewBookingTimes {
  readonly startAtMs: number;
  readonly endAtMs: number;
  readonly nowMs: number;
}

export interface BookingPolicyRejection {
  readonly message: string;
}

export type NewBookingPolicy = (times: NewBookingTimes) => BookingPolicyRejection | undefined;

export interface BookingPolicyRegistration {
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly validate: NewBookingPolicy;
}

export function validateNewBooking(
  registrations: readonly BookingPolicyRegistration[],
  scope: { tenantId: string; workspaceId?: string | null },
  times: NewBookingTimes
): BookingPolicyRejection | undefined {
  for (const registration of registrations) {
    if (
      registration.tenantId === scope.tenantId &&
      registration.workspaceId === scope.workspaceId
    ) {
      const rejection = registration.validate(times);
      if (rejection) {
        return rejection;
      }
    }
  }
}
