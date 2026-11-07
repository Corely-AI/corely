import { resolveIdempotencyKey } from "../../../../shared/http/usecase-mappers";
import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  Inject,
  BadRequestException,
} from "@nestjs/common";
import { ZodError } from "zod";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { toUseCaseContext, type ContextAwareRequest } from "../../../../shared/request-context";
import { StaffDirectoryUseCase } from "../../application/staff-directory.usecase";

@Controller("people/staff")
@UseGuards(AuthGuard)
export class StaffController {
  constructor(@Inject(StaffDirectoryUseCase) private readonly staff: StaffDirectoryUseCase) {}
  // All People DTOs, including neutral ones, bypass shared/browser caches.
  @Get()
  @Header("Cache-Control", "private, no-store")
  list(@Query() query: unknown, @Req() req: ContextAwareRequest) {
    return this.parse(() => this.staff.list(query, toUseCaseContext(req)));
  }
  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  detail(@Param("id") id: string, @Req() req: ContextAwareRequest) {
    return this.staff.detail(id, toUseCaseContext(req));
  }
  @Get(":id/management")
  @Header("Cache-Control", "private, no-store")
  management(@Param("id") id: string, @Req() req: ContextAwareRequest) {
    return this.staff.managementDetail(id, toUseCaseContext(req));
  }
  @Get(":id/private")
  @Header("Cache-Control", "private, no-store")
  privateDetail(@Param("id") id: string, @Req() req: ContextAwareRequest) {
    return this.staff.privateDetail(id, toUseCaseContext(req));
  }
  @Post()
  @Header("Cache-Control", "private, no-store")
  create(@Body() body: unknown, @Req() req: ContextAwareRequest) {
    return this.parse(() =>
      this.staff.command("create", null, body, resolveIdempotencyKey(req), toUseCaseContext(req))
    );
  }
  @Patch(":id")
  @Header("Cache-Control", "private, no-store")
  update(@Param("id") id: string, @Body() body: unknown, @Req() req: ContextAwareRequest) {
    return this.parse(() =>
      this.staff.command("update", id, body, resolveIdempotencyKey(req), toUseCaseContext(req))
    );
  }
  @Post(":id/archive")
  @Header("Cache-Control", "private, no-store")
  archive(@Param("id") id: string, @Body() body: unknown, @Req() req: ContextAwareRequest) {
    return this.parse(() =>
      this.staff.command("archive", id, body, resolveIdempotencyKey(req), toUseCaseContext(req))
    );
  }
  @Patch(":id/private")
  @Header("Cache-Control", "private, no-store")
  privateUpdate(@Param("id") id: string, @Body() body: unknown, @Req() req: ContextAwareRequest) {
    return this.parse(() =>
      this.staff.command("private", id, body, resolveIdempotencyKey(req), toUseCaseContext(req))
    );
  }
  private async parse<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException("Invalid staff request");
      }
      throw error;
    }
  }
}
