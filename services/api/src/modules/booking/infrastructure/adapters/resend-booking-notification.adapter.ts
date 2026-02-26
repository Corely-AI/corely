import { ResendEmailSenderAdapter } from "@corely/email";
import type {
  BookingNotificationPort,
  SendBookingConfirmationEmailsInput,
} from "../../application/ports/booking-notification.port";

const DEFAULT_FROM = "Corely <no-reply@example.com>";

const normalizeEmail = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export class ResendBookingNotificationAdapter implements BookingNotificationPort {
  private readonly sender: ResendEmailSenderAdapter;

  constructor(apiKey?: string, fromAddress?: string, replyTo?: string) {
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is required for booking notifications");
    }

    this.sender = new ResendEmailSenderAdapter({
      apiKey,
      fromAddress: fromAddress ?? DEFAULT_FROM,
      replyTo,
    });
  }

  async sendBookingConfirmationEmails(input: SendBookingConfirmationEmailsInput): Promise<void> {
    const customerEmail = normalizeEmail(input.customerEmail);
    const ownerEmail = normalizeEmail(input.ownerEmail);

    const details = this.formatDetails(input.startAt, input.endAt, input.timezone);
    const serviceLine = input.serviceName ? input.serviceName : "General booking";
    const referenceLine = input.referenceNumber ? `Reference: ${input.referenceNumber}` : "";

    if (customerEmail) {
      const customerName = input.customerName?.trim() || "there";
      const customerSubject = `Booking confirmed at ${input.venueName}`;
      const customerText = [
        `Hi ${customerName},`,
        "",
        "Your booking is confirmed.",
        `Venue: ${input.venueName}`,
        `Service: ${serviceLine}`,
        `When: ${details}`,
        referenceLine,
      ]
        .filter(Boolean)
        .join("\n");

      const customerHtml = [
        `<p>Hi ${escapeHtml(customerName)},</p>`,
        "<p>Your booking is confirmed.</p>",
        "<ul>",
        `<li><strong>Venue:</strong> ${escapeHtml(input.venueName)}</li>`,
        `<li><strong>Service:</strong> ${escapeHtml(serviceLine)}</li>`,
        `<li><strong>When:</strong> ${escapeHtml(details)}</li>`,
        input.referenceNumber
          ? `<li><strong>Reference:</strong> ${escapeHtml(input.referenceNumber)}</li>`
          : "",
        "</ul>",
      ]
        .filter(Boolean)
        .join("");

      await this.sender.sendEmail({
        tenantId: input.tenantId,
        to: [customerEmail],
        subject: customerSubject,
        text: customerText,
        html: customerHtml,
        idempotencyKey: input.idempotencyKeyBase
          ? `${input.idempotencyKeyBase}:customer`
          : `booking-confirm:${input.bookingId}:customer`,
        headers: {
          "X-Booking-Id": input.bookingId,
          "X-Notification-Role": "customer",
        },
      });
    }

    if (ownerEmail && ownerEmail !== customerEmail) {
      const customerLabel = input.customerName?.trim() || "Guest";
      const ownerSubject = `New booking confirmed at ${input.venueName}`;
      const ownerText = [
        "A new booking has been confirmed.",
        "",
        `Customer: ${customerLabel}${customerEmail ? ` (${customerEmail})` : ""}`,
        `Venue: ${input.venueName}`,
        `Service: ${serviceLine}`,
        `When: ${details}`,
        referenceLine,
      ]
        .filter(Boolean)
        .join("\n");

      const ownerHtml = [
        "<p>A new booking has been confirmed.</p>",
        "<ul>",
        `<li><strong>Customer:</strong> ${escapeHtml(customerLabel)}${
          customerEmail ? ` (${escapeHtml(customerEmail)})` : ""
        }</li>`,
        `<li><strong>Venue:</strong> ${escapeHtml(input.venueName)}</li>`,
        `<li><strong>Service:</strong> ${escapeHtml(serviceLine)}</li>`,
        `<li><strong>When:</strong> ${escapeHtml(details)}</li>`,
        input.referenceNumber
          ? `<li><strong>Reference:</strong> ${escapeHtml(input.referenceNumber)}</li>`
          : "",
        "</ul>",
      ]
        .filter(Boolean)
        .join("");

      await this.sender.sendEmail({
        tenantId: input.tenantId,
        to: [ownerEmail],
        subject: ownerSubject,
        text: ownerText,
        html: ownerHtml,
        idempotencyKey: input.idempotencyKeyBase
          ? `${input.idempotencyKeyBase}:owner`
          : `booking-confirm:${input.bookingId}:owner`,
        headers: {
          "X-Booking-Id": input.bookingId,
          "X-Notification-Role": "owner",
        },
      });
    }
  }

  private formatDetails(startAt: Date, endAt: Date, timezone: string): string {
    const safeTimezone = this.resolveTimezone(timezone);

    const dateFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: safeTimezone,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const timeFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: safeTimezone,
      hour: "numeric",
      minute: "2-digit",
    });

    return `${dateFormatter.format(startAt)} • ${timeFormatter.format(startAt)}-${timeFormatter.format(
      endAt
    )} (${safeTimezone})`;
  }

  private resolveTimezone(timezone: string): string {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
      return timezone;
    } catch {
      return "UTC";
    }
  }
}
