export interface SendBookingConfirmationEmailsInput {
  tenantId: string;
  bookingId: string;
  idempotencyKeyBase?: string;
  venueName: string;
  timezone: string;
  serviceName?: string | null;
  startAt: Date;
  endAt: Date;
  referenceNumber?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  ownerEmail?: string | null;
}

export interface BookingNotificationPort {
  sendBookingConfirmationEmails(input: SendBookingConfirmationEmailsInput): Promise<void>;
}

export const BOOKING_NOTIFICATION_PORT = "booking/notification-port";
