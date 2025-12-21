import { Injectable } from "@nestjs/common";
import { NotificationPort } from "../../application/ports/notification.port";

@Injectable()
export class NoopNotificationAdapter implements NotificationPort {
  async sendInvoiceEmail(_tenantId: string, _payload: { invoiceId: string; to?: string }) {
    return;
  }
}
