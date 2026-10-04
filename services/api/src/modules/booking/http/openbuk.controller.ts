import { OpenBukRateLimitGuard } from "./openbuk-rate-limit.guard";
import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import {
  OpenBukSetupSchema,
  OpenBukBookSchema,
  OpenBukAvailabilityQuerySchema,
} from "@corely/contracts";
import { AuthGuard } from "../../identity/adapters/http/auth.guard";
import { buildUseCaseContext } from "../../../shared/http/usecase-mappers";
import { PublicWorkspaceRoute } from "../../../shared/public";
import { OpenBukStudioUseCase } from "../application/use-cases/openbuk-studio.usecase";

@Controller("openbuk")
@UseGuards(AuthGuard)
export class OpenBukAdminController {
  constructor(private readonly app: OpenBukStudioUseCase) {}
  @Get("studio")
  studio(@Req() req: Request) {
    return this.app.getStudio(buildUseCaseContext(req));
  }
  @Put("studio")
  configure(@Body() body: unknown, @Req() req: Request) {
    return this.app.configure(OpenBukSetupSchema.parse(body), buildUseCaseContext(req));
  }
  @Get("bookings")
  bookings(@Query() query: Record<string, unknown>, @Req() req: Request) {
    return this.app.appointments(
      OpenBukAvailabilityQuerySchema.parse(query).day,
      buildUseCaseContext(req)
    );
  }
}

@Controller("public/openbuk")
@PublicWorkspaceRoute()
@UseGuards(OpenBukRateLimitGuard)
export class OpenBukPublicController {
  constructor(private readonly app: OpenBukStudioUseCase) {}
  @Get("studio")
  @Header("Cache-Control", "no-store")
  studio(@Req() req: Request) {
    return this.app.publicStudio(buildUseCaseContext(req));
  }
  @Get("availability")
  @Header("Cache-Control", "no-store")
  availability(@Query() query: Record<string, unknown>, @Req() req: Request) {
    return this.app.availability(
      OpenBukAvailabilityQuerySchema.parse(query).day,
      buildUseCaseContext(req)
    );
  }
  @Post("bookings")
  @Header("Cache-Control", "no-store")
  book(@Body() body: unknown, @Headers("idempotency-key") key: string, @Req() req: Request) {
    return this.app.book(OpenBukBookSchema.parse(body), key ?? "", buildUseCaseContext(req));
  }
}
