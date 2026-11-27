import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  type RawBodyRequest,
} from "@nestjs/common";
import type { Request } from "express";
import { Resend } from "resend";
import { z } from "zod";
import { EnvService } from "@corely/config";
import { InvoiceEmailIntake } from "../../application/invoice-email-intake";

const emailReceivedSchema = z.object({
  email_id: z.string().min(1),
  to: z.array(z.string()),
  attachments: z.array(
    z.object({
      id: z.string().min(1),
      filename: z.string().nullish(),
      content_type: z.string(),
      content_disposition: z.string().nullish(),
      content_id: z.string().nullish(),
    })
  ),
});

@Controller("purchasing/invoice-email")
export class InvoiceEmailWebhookController {
  private readonly verifier = new Resend("invoice-email-webhook-verifier");

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
    const id = req.header("svix-id");
    const timestamp = req.header("svix-timestamp");
    const signature = req.header("svix-signature");
    if (!req.rawBody || !id || !timestamp || !signature) {
      throw new UnauthorizedException("Missing invoice email signature");
    }
    let event;
    try {
      event = this.verifier.webhooks.verify({
        payload: req.rawBody.toString("utf8"),
        webhookSecret: secret,
        headers: { id, timestamp, signature },
      });
    } catch {
      throw new UnauthorizedException("Invalid invoice email signature");
    }
    if (event.type !== "email.received") {
      return;
    }
    const parsed = emailReceivedSchema.safeParse(event.data);
    if (!parsed.success) {
      throw new BadRequestException("Invalid invoice email delivery");
    }
    const { email_id, to, attachments } = parsed.data;
    if (
      !(await this.intake.receive({
        id: email_id,
        to,
        attachments: attachments.map(({ id, content_type, ...metadata }) => ({
          id,
          content_type,
          ...metadata,
        })),
      }))
    ) {
      throw new ServiceUnavailableException("Some invoice attachments could not be imported");
    }
  }
}
