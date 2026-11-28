import { Body, Controller, Header, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  OpenBukManageAvailabilityInputSchema,
  OpenBukManageCancelInputSchema,
  OpenBukManageInputSchema,
  OpenBukManageMoveInputSchema,
} from "@corely/contracts";
import { PublicWorkspaceRoute } from "../../../shared/public";
import { buildUseCaseContext, resolveIdempotencyKey } from "../../../shared/http/usecase-mappers";
import { OpenBukGuestManagementUseCase } from "../application/use-cases/openbuk-guest-management.usecase";
import { OpenBukRateLimitGuard } from "./openbuk-rate-limit.guard";

@Controller("public/openbuk/manage")
@PublicWorkspaceRoute()
@UseGuards(OpenBukRateLimitGuard)
export class OpenBukManagementController {
  constructor(private readonly management: OpenBukGuestManagementUseCase) {}

  @Post()
  @Header("Cache-Control", "no-store")
  view(@Body() body: unknown, @Req() req: Request) {
    const input = OpenBukManageInputSchema.parse(body);
    return this.management.read(input.token, buildUseCaseContext(req));
  }

  @Post("availability")
  @Header("Cache-Control", "no-store")
  availability(@Body() body: unknown, @Req() req: Request) {
    const input = OpenBukManageAvailabilityInputSchema.parse(body);
    return this.management.availability(input.token, input.day, buildUseCaseContext(req));
  }

  @Post("move")
  @Header("Cache-Control", "no-store")
  move(@Body() body: unknown, @Req() req: Request) {
    const input = OpenBukManageMoveInputSchema.parse(body);
    return this.management.execute(
      input.token,
      { kind: "move", version: input.version, startAt: input.startAt },
      resolveIdempotencyKey(req) ?? "",
      buildUseCaseContext(req)
    );
  }

  @Post("cancel")
  @Header("Cache-Control", "no-store")
  cancel(@Body() body: unknown, @Req() req: Request) {
    const input = OpenBukManageCancelInputSchema.parse(body);
    return this.management.execute(
      input.token,
      { kind: "cancel", version: input.version },
      resolveIdempotencyKey(req) ?? "",
      buildUseCaseContext(req)
    );
  }
}
