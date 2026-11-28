import {
  Controller,
  HttpCode,
  Post,
  Req,
  ServiceUnavailableException,
  type RawBodyRequest,
} from "@nestjs/common";
import type { Request } from "express";
import { verifyResendReceivingEvent } from "../../../../shared/inbound-email/resend-receiving";
import { EnvService } from "@corely/config";
import { InvoiceEmailIntake } from "../../application/invoice-email-intake";

@Controller("purchasing/invoice-email")
export class InvoiceEmailWebhookController {
  constructor(
    private readonly intake: InvoiceEmailIntake,
    private readonly env: EnvService
  ) {}

  @Post("resend")
  @HttpCode(204)
  async receive(@Req() req: RawBodyRequest<Request>) {
    const secret = this.env.INVOICE_EMAIL_RESEND_WEBHOOK_SECRET;
    if (!secret || !this.env.INVOICE_EMAIL_DOMAIN || !this.env.RESEND_API_KEY) {
      throw new ServiceUnavailableException("Invoice email receiving is unavailable");
    }
    const email = verifyResendReceivingEvent(req, secret);
    if (email && !(await this.intake.receive(email))) {
      throw new ServiceUnavailableException("Some invoice attachments could not be imported");
    }
  }
}
