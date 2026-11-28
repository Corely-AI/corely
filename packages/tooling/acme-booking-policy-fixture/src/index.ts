import type { NewBookingPolicy } from "@corely/booking/extensions";

const minute = 60_000;

export const acmeBookingPolicy: NewBookingPolicy = ({ startAtMs, endAtMs, nowMs }) => {
  if (endAtMs - startAtMs > 90 * minute && startAtMs - nowMs < 48 * 60 * minute) {
    return { message: "Choose a time at least 48 hours ahead for appointments over 90 minutes." };
  }
};
