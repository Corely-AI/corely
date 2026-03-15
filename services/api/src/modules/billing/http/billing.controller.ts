import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import {
  BillingWebhookAckSchema,
  BillingProductKeySchema,
  CreateBillingCheckoutSessionInputSchema,
  CreateBillingPortalSessionInputSchema,
  StartBillingTrialInputSchema,
} from "@corely/contracts";
import { AuthGuard } from "../../identity";
import { buildUseCaseContext, mapResultToHttp } from "@/shared/http/usecase-mappers";
import type { ContextAwareRequest } from "@/shared/request-context";
import { GetBillingCurrentQueryUseCase } from "../application/use-cases/get-billing-current.query";
import { GetBillingUsageQueryUseCase } from "../application/use-cases/get-billing-usage.query";
import { GetBillingOverviewQueryUseCase } from "../application/use-cases/get-billing-overview.query";
import { GetBillingUpgradeContextQueryUseCase } from "../application/use-cases/get-billing-upgrade-context.query";
import { CreateBillingCheckoutSessionUseCase } from "../application/use-cases/create-billing-checkout-session.usecase";
import { CreateBillingPortalSessionUseCase } from "../application/use-cases/create-billing-portal-session.usecase";
import { ResyncBillingSubscriptionUseCase } from "../application/use-cases/resync-billing-subscription.usecase";
import { ProcessStripeWebhookUseCase } from "../application/use-cases/process-stripe-webhook.usecase";
import { StartBillingTrialUseCase } from "../application/use-cases/start-billing-trial.usecase";

@Controller()
export class BillingController {
  constructor(
    private readonly getCurrentQuery: GetBillingCurrentQueryUseCase,
    private readonly getUsageQuery: GetBillingUsageQueryUseCase,
    private readonly getOverviewQuery: GetBillingOverviewQueryUseCase,
    private readonly getUpgradeContextQuery: GetBillingUpgradeContextQueryUseCase,
    private readonly createCheckoutUseCase: CreateBillingCheckoutSessionUseCase,
    private readonly createPortalUseCase: CreateBillingPortalSessionUseCase,
    private readonly startTrialUseCase: StartBillingTrialUseCase,
    private readonly resyncUseCase: ResyncBillingSubscriptionUseCase,
    private readonly processStripeWebhookUseCase: ProcessStripeWebhookUseCase
  ) {}

  @Get("billing/current")
  @UseGuards(AuthGuard)
  async getCurrent(@Req() req: ContextAwareRequest) {
    const productKey = BillingProductKeySchema.optional().parse(req.query.productKey);
    const result = await this.getCurrentQuery.execute({ productKey }, buildUseCaseContext(req));
    return mapResultToHttp(result);
  }

  @Get("billing/usage")
  @UseGuards(AuthGuard)
  async getUsage(@Req() req: ContextAwareRequest) {
    const productKey = BillingProductKeySchema.optional().parse(req.query.productKey);
    const result = await this.getUsageQuery.execute({ productKey }, buildUseCaseContext(req));
    return mapResultToHttp(result);
  }

  @Get("billing/overview")
  @UseGuards(AuthGuard)
  async getOverview(@Req() req: ContextAwareRequest) {
    const productKey = BillingProductKeySchema.optional().parse(req.query.productKey);
    const result = await this.getOverviewQuery.execute({ productKey }, buildUseCaseContext(req));
    return mapResultToHttp(result);
  }

  @Get("billing/upgrade-context")
  @UseGuards(AuthGuard)
  async getUpgradeContext(@Req() req: ContextAwareRequest) {
    const productKey = BillingProductKeySchema.optional().parse(req.query.productKey);
    const result = await this.getUpgradeContextQuery.execute(
      { productKey },
      buildUseCaseContext(req)
    );
    return mapResultToHttp(result);
  }

  @Post("billing/checkout-session")
  @UseGuards(AuthGuard)
  async createCheckout(@Req() req: ContextAwareRequest, @Body() body: unknown) {
    const input = CreateBillingCheckoutSessionInputSchema.parse(body);
    const result = await this.createCheckoutUseCase.execute(input, buildUseCaseContext(req));
    return mapResultToHttp(result);
  }

  @Post("billing/portal-session")
  @UseGuards(AuthGuard)
  async createPortal(@Req() req: ContextAwareRequest, @Body() body: unknown) {
    const input = CreateBillingPortalSessionInputSchema.parse(body);
    const result = await this.createPortalUseCase.execute(input, buildUseCaseContext(req));
    return mapResultToHttp(result);
  }

  @Post("billing/trial/start")
  @HttpCode(201)
  @UseGuards(AuthGuard)
  async startTrial(@Req() req: ContextAwareRequest, @Body() body: unknown) {
    const input = StartBillingTrialInputSchema.parse(body);
    const result = await this.startTrialUseCase.execute(input, buildUseCaseContext(req));
    return mapResultToHttp(result);
  }

  @Post("billing/resync")
  @UseGuards(AuthGuard)
  async resync(@Req() req: ContextAwareRequest, @Body() body: unknown) {
    const productKey = BillingProductKeySchema.optional().parse(
      (body as { productKey?: string } | undefined)?.productKey
    );
    const result = await this.resyncUseCase.execute({ productKey }, buildUseCaseContext(req));
    return mapResultToHttp(result);
  }

  @Post("billing/webhooks/stripe")
  @HttpCode(200)
  async handleStripeWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers("stripe-signature") signature: string | undefined,
    @Res() res: Response
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      res.status(400).json({ received: false, error: "Missing raw body" });
      return;
    }

    await this.processStripeWebhookUseCase.execute(rawBody, signature);
    const response = BillingWebhookAckSchema.parse({ received: true });
    res.status(200).json(response);
  }
}
