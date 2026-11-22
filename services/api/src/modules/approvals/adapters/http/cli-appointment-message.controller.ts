import {
  CliAppointmentMessageDraftRequestSchema,
  CliAppointmentMessageOperations,
  CliAppointmentReviewSelectorSchema,
} from "@corely/contracts";
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseFilters,
} from "@nestjs/common";
import type { Request } from "express";
import { CliOperationAccess, SsoExceptionFilter } from "../../../identity/public/cli";
import { AppointmentReviewUseCase } from "../../application/appointment-review.usecase";

@Controller("sso/cli/appointments/messages")
@UseFilters(SsoExceptionFilter)
export class CliAppointmentMessageController {
  constructor(
    private readonly reviews: AppointmentReviewUseCase,
    private readonly access: CliOperationAccess
  ) {}

  @Post("draft")
  @HttpCode(200)
  draft(@Req() req: Request, @Body() input: unknown) {
    const parsed = CliAppointmentMessageDraftRequestSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(
        "Select the workspace, applied appointment review and idempotency key"
      );
    }
    const { tenantId, workspaceId, reviewId, note, key } = parsed.data;
    const scope = { tenantId, workspaceId };
    return this.access.run(req, scope, CliAppointmentMessageOperations.draft.id, (actor, tx) =>
      this.reviews.proposeMessage({ ...scope, ...actor }, reviewId, note, key, tx)
    );
  }

  @Post("status")
  @HttpCode(200)
  status(@Req() req: Request, @Body() input: unknown) {
    return this.command("status", req, input);
  }

  @Post("queue")
  @HttpCode(200)
  queue(@Req() req: Request, @Body() input: unknown) {
    return this.command("queue", req, input);
  }

  @Post("retry")
  @HttpCode(200)
  retry(@Req() req: Request, @Body() input: unknown) {
    return this.command("retry", req, input);
  }

  private command(action: "status" | "queue" | "retry", req: Request, input: unknown) {
    const parsed = CliAppointmentReviewSelectorSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException("Select the workspace and email review");
    }
    const { tenantId, workspaceId, reviewId } = parsed.data;
    const scope = { tenantId, workspaceId };
    return this.access.run(req, scope, CliAppointmentMessageOperations[action].id, (actor, tx) => {
      const principal = { ...scope, ...actor };
      switch (action) {
        case "status":
          return this.reviews.get(principal, reviewId, "message", tx);
        case "queue":
          return this.reviews.apply(principal, reviewId, "message", tx);
        case "retry":
          return this.reviews.retryDelivery(principal, reviewId, tx);
      }
    });
  }
}
