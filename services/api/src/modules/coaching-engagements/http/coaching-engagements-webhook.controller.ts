import { Controller, Headers, HttpCode, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { CoachingEngagementsApplication } from "../application/coaching-engagements.application";

@Controller("coaching-engagements/webhooks")
export class CoachingEngagementsWebhookController {
  constructor(private readonly app: CoachingEngagementsApplication) {}

  @Post("stripe")
  @HttpCode(200)
  async handleStripe(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers("stripe-signature") signature: string | undefined,
    @Res() res: Response
  ) {
    if (!req.rawBody) {
      return res.status(400).json({ received: false, error: "Missing raw body" });
    }

    await this.app.processStripeWebhook.execute(req.rawBody, signature);
    return res.status(200).json({ received: true });
  }
}
