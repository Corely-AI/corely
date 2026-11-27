import {
  Controller,
  HttpCode,
  Post,
  Req,
  ServiceUnavailableException,
  type RawBodyRequest,
} from "@nestjs/common";
import { EnvService } from "@corely/config";
import type { Request } from "express";
import { verifyResendReceivingEvent } from "../../../shared/inbound-email/resend-receiving";
import { ExpenseReceiptEmail } from "../application/expense-receipt-email";

@Controller("expense-receipts")
export class ExpenseReceiptWebhookController {
  constructor(
    private readonly intake: ExpenseReceiptEmail,
    private readonly env: EnvService
  ) {}

  @Post("resend")
  @HttpCode(204)
  async receive(@Req() req: RawBodyRequest<Request>) {
    const secret = this.env.getValue("EXPENSE_EMAIL_RESEND_WEBHOOK_SECRET");
    if (!secret || !this.env.getValue("EXPENSE_EMAIL_DOMAIN") || !this.env.RESEND_API_KEY) {
      throw new ServiceUnavailableException("Expense email receiving is unavailable");
    }
    const email = verifyResendReceivingEvent(req, secret);
    if (email && !(await this.intake.receive(email))) {
      throw new ServiceUnavailableException("Some receipt attachments could not be imported");
    }
  }
}
