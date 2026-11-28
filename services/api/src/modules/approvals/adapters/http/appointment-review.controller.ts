import {
  AppointmentReviewDecisionSchema,
  AppointmentReviewIdSchema,
  OperationalPlanRequestSchema,
} from "@corely/contracts";
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { buildUseCaseContext } from "../../../../shared/http/usecase-mappers";
import { OperationalPlanUseCase } from "../../application/operational-plan.usecase";
import { AppointmentReviewUseCase } from "../../application/appointment-review.usecase";

@Controller("openbuk/appointment-reviews")
@UseGuards(AuthGuard)
export class AppointmentReviewController {
  constructor(
    private readonly reviews: AppointmentReviewUseCase,
    private readonly plans: OperationalPlanUseCase
  ) {}

  @Post("proposals")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  propose(@Req() req: Request, @Body() input: unknown) {
    const parsed = OperationalPlanRequestSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException("Select one or more valid changes");
    }
    return this.plans.propose(this.actor(req), parsed.data);
  }

  @Post(":id/apply")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  async apply(@Req() req: Request, @Param("id") rawId: string) {
    const actor = this.actor(req);
    const id = this.id(rawId);
    const current = await this.reviews.get(actor, id);
    return this.reviews.apply(actor, id, current.action.kind);
  }

  @Post(":id/retry-delivery")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  retryDelivery(@Req() req: Request, @Param("id") rawId: string) {
    return this.reviews.retryDelivery(this.actor(req), this.id(rawId));
  }

  @Get(":id")
  @Header("Cache-Control", "no-store")
  get(@Req() req: Request, @Param("id") id: string) {
    return this.reviews.get(this.actor(req), this.id(id));
  }

  @Post(":id/decision")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  decide(@Req() req: Request, @Param("id") id: string, @Body() input: unknown) {
    const parsed = AppointmentReviewDecisionSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException("A decision and exact review digest are required");
    }
    return this.reviews.decide(this.actor(req), this.id(id), parsed.data);
  }

  private actor(req: Request) {
    const { tenantId, workspaceId, userId } = buildUseCaseContext(req);
    if (!tenantId || !workspaceId || !userId) {
      throw new ForbiddenException("Select an authorized workspace");
    }
    return { tenantId, workspaceId, userId };
  }

  private id(input: string) {
    const parsed = AppointmentReviewIdSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException("Invalid appointment review");
    }
    return parsed.data;
  }
}
