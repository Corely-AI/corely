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
  OpenBukSetupDraftSchema,
  OpenBukBookSchema,
  OpenBukAvailabilityQuerySchema,
  OpenBukDaySchema,
  OpenBukTeamUpdateSchema,
  OpenBukReplacementInputSchema,
  OpenBukReplacementSchema,
  OpenBukAgendaQuerySchema,
  OpenBukManagerBookSchema,
  OpenBukManagerCancelSchema,
} from "@corely/contracts";
import { AuthGuard } from "../../identity/adapters/http/auth.guard";
import { buildUseCaseContext, resolveIdempotencyKey } from "../../../shared/http/usecase-mappers";
import { PublicWorkspaceRoute } from "../../../shared/public";
import { OpenBukStudioUseCase } from "../application/use-cases/openbuk-studio.usecase";
import { OpenBukAppointmentChangeUseCase } from "../application/use-cases/openbuk-appointment-change.usecase";
import { OpenBukAgendaCommandsUseCase } from "../application/use-cases/openbuk-agenda-commands.usecase";

@Controller("openbuk")
@UseGuards(AuthGuard)
export class OpenBukAdminController {
  constructor(
    private readonly app: OpenBukStudioUseCase,
    private readonly changes: OpenBukAppointmentChangeUseCase,
    private readonly agendaCommands: OpenBukAgendaCommandsUseCase
  ) {}
  @Get("studio")
  @Header("Cache-Control", "no-store")
  studio(@Req() req: Request) {
    return this.app.getStudio(buildUseCaseContext(req));
  }
  @Get("setup")
  @Header("Cache-Control", "no-store")
  setup(@Req() req: Request) {
    return this.app.getSetup(buildUseCaseContext(req));
  }
  @Put("setup")
  @Header("Cache-Control", "no-store")
  saveSetup(@Body() body: unknown, @Req() req: Request) {
    return this.app.saveSetup(OpenBukSetupDraftSchema.parse(body), buildUseCaseContext(req));
  }
  @Put("studio")
  configure(@Body() body: unknown, @Req() req: Request) {
    return this.app.configure(OpenBukSetupSchema.parse(body), buildUseCaseContext(req));
  }
  @Post("studio/publish")
  publish(@Body() body: unknown, @Req() req: Request) {
    return this.app.publishSetup(OpenBukSetupSchema.parse(body), buildUseCaseContext(req));
  }
  @Get("bookings")
  bookings(@Query() query: Record<string, unknown>, @Req() req: Request) {
    return this.app.appointments(OpenBukDaySchema.parse(query.day), buildUseCaseContext(req));
  }
  @Get("team")
  @Header("Cache-Control", "no-store")
  team(@Req() req: Request) {
    return this.app.getTeam(buildUseCaseContext(req));
  }
  @Put("team")
  @Header("Cache-Control", "no-store")
  saveTeam(@Body() body: unknown, @Req() req: Request) {
    return this.app.saveTeam(OpenBukTeamUpdateSchema.parse(body), buildUseCaseContext(req));
  }
  @Post("booking-changes/preview")
  @Header("Cache-Control", "no-store")
  previewChange(@Body() body: unknown, @Req() req: Request) {
    return this.changes.preview(
      OpenBukReplacementInputSchema.parse(body),
      buildUseCaseContext(req)
    );
  }
  @Get("agenda")
  @Header("Cache-Control", "no-store")
  agenda(@Query() query: Record<string, unknown>, @Req() req: Request) {
    return this.app.agenda(OpenBukAgendaQuerySchema.parse(query), buildUseCaseContext(req));
  }
  @Post("agenda/bookings")
  @Header("Cache-Control", "no-store")
  book(@Body() body: unknown, @Req() req: Request) {
    return this.app.bookForStudio(
      OpenBukManagerBookSchema.parse(body),
      resolveIdempotencyKey(req) ?? "",
      buildUseCaseContext(req)
    );
  }
  @Post("booking-changes/apply")
  @Header("Cache-Control", "no-store")
  applyChange(@Body() body: unknown, @Req() req: Request) {
    return this.agendaCommands.move(
      OpenBukReplacementSchema.parse(body),
      resolveIdempotencyKey(req) ?? "",
      buildUseCaseContext(req)
    );
  }
  @Post("agenda/cancellations")
  @Header("Cache-Control", "no-store")
  cancel(@Body() body: unknown, @Req() req: Request) {
    return this.agendaCommands.cancel(
      OpenBukManagerCancelSchema.parse(body),
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
    const { day, serviceId, staffId } = OpenBukAvailabilityQuerySchema.parse(query);
    return this.app.availability(
      day,
      buildUseCaseContext(req),
      serviceId && staffId ? { serviceId, staffId } : undefined
    );
  }
  @Post("bookings")
  @Header("Cache-Control", "no-store")
  book(@Body() body: unknown, @Headers("idempotency-key") key: string, @Req() req: Request) {
    return this.app.book(OpenBukBookSchema.parse(body), key ?? "", buildUseCaseContext(req));
  }
}
