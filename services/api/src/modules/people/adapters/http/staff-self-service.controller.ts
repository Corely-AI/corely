import {
  Controller,
  Get,
  Patch,
  Post,
  Header,
  UseGuards,
  Inject,
  Body,
  Req,
  Param,
  BadRequestException,
} from "@nestjs/common";
import { ZodError } from "zod";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { toUseCaseContext, type ContextAwareRequest } from "../../../../shared/request-context";
import { resolveIdempotencyKey } from "../../../../shared/http/usecase-mappers";
import { StaffSelfServiceUseCase } from "../../application/staff-self-service.usecase";
import { StaffLifecycleUseCase } from "../../application/staff-lifecycle.usecase";
@Controller("people")
@UseGuards(AuthGuard)
export class StaffSelfServiceController {
  constructor(
    @Inject(StaffSelfServiceUseCase) private readonly self: StaffSelfServiceUseCase,
    @Inject(StaffLifecycleUseCase) private readonly lifecycle: StaffLifecycleUseCase
  ) {}
  @Get("me")
  @Header("Cache-Control", "private, no-store")
  detail(@Req() req: ContextAwareRequest) {
    return this.self.detail(toUseCaseContext(req));
  }
  @Patch("me")
  @Header("Cache-Control", "private, no-store")
  save(@Body() body: unknown, @Req() req: ContextAwareRequest) {
    return this.parse(() =>
      this.self.save(body, resolveIdempotencyKey(req), toUseCaseContext(req))
    );
  }
  @Get("staff/:id/lifecycle")
  @Header("Cache-Control", "private, no-store")
  manager(@Param("id") id: string, @Req() req: ContextAwareRequest) {
    return this.lifecycle.detail(id, toUseCaseContext(req));
  }
  @Post("staff/:id/onboarding")
  @Header("Cache-Control", "private, no-store")
  onboarding(@Param("id") id: string, @Body() body: unknown, @Req() req: ContextAwareRequest) {
    return this.parse(() =>
      this.lifecycle.command(
        "onboarding",
        id,
        body,
        resolveIdempotencyKey(req),
        toUseCaseContext(req)
      )
    );
  }
  @Post("staff/:id/offboard")
  @Header("Cache-Control", "private, no-store")
  offboard(@Param("id") id: string, @Body() body: unknown, @Req() req: ContextAwareRequest) {
    return this.parse(() =>
      this.lifecycle.command(
        "offboard",
        id,
        body,
        resolveIdempotencyKey(req),
        toUseCaseContext(req)
      )
    );
  }
  private async parse<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException("Invalid staff self-service command");
      }
      throw error;
    }
  }
}
