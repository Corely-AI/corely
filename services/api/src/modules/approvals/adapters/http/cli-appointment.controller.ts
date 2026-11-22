import {
  CliAppointmentOperations,
  CliAppointmentProposalRequestSchema,
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

@Controller("sso/cli/appointments")
@UseFilters(SsoExceptionFilter)
export class CliAppointmentController {
  constructor(
    private readonly reviews: AppointmentReviewUseCase,
    private readonly access: CliOperationAccess
  ) {}

  @Post("propose")
  @HttpCode(200)
  propose(@Req() req: Request, @Body() input: unknown) {
    const parsed = CliAppointmentProposalRequestSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException("Select a workspace, booking, new start and idempotency key");
    }
    const {
      tenantId,
      workspaceId,
      proposal: { key, ...proposal },
    } = parsed.data;
    const scope = { tenantId, workspaceId };
    return this.access.run(req, scope, CliAppointmentOperations.propose.id, (actor, tx) =>
      this.reviews.proposeReplacement({ ...scope, ...actor }, proposal, key, tx)
    );
  }

  @Post("status")
  @HttpCode(200)
  status(@Req() req: Request, @Body() input: unknown) {
    return this.reviewCommand("status", req, input);
  }

  @Post("apply")
  @HttpCode(200)
  apply(@Req() req: Request, @Body() input: unknown) {
    return this.reviewCommand("apply", req, input);
  }

  private reviewCommand(command: "status" | "apply", req: Request, input: unknown) {
    const parsed = CliAppointmentReviewSelectorSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException("Select the workspace and appointment review");
    }
    const { tenantId, workspaceId, reviewId } = parsed.data;
    const scope = { tenantId, workspaceId };
    return this.access.run(req, scope, CliAppointmentOperations[command].id, (actor, tx) =>
      command === "status"
        ? this.reviews.get({ ...scope, ...actor }, reviewId, "replacement", tx)
        : this.reviews.apply({ ...scope, ...actor }, reviewId, "replacement", tx)
    );
  }
}
