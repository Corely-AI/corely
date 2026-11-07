import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ZodError } from "zod";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { toUseCaseContext, type ContextAwareRequest } from "../../../../shared/request-context";
import { resolveIdempotencyKey } from "../../../../shared/http/usecase-mappers";
import { EmployeeTasksUseCase } from "../../application/employee-tasks.usecase";
@Controller("tasks")
@UseGuards(AuthGuard)
export class EmployeeTasksController {
  constructor(@Inject(EmployeeTasksUseCase) private readonly tasks: EmployeeTasksUseCase) {}
  @Get()
  @Header("Cache-Control", "private, no-store")
  list(@Query() query: unknown, @Req() req: ContextAwareRequest) {
    return this.parse(() => this.tasks.list(query, toUseCaseContext(req)));
  }
  @Get("assignees")
  @Header("Cache-Control", "private, no-store")
  assignees(@Req() req: ContextAwareRequest) {
    return this.tasks.assignees(toUseCaseContext(req));
  }
  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  detail(@Param("id") id: string, @Req() req: ContextAwareRequest) {
    return this.tasks.detail(id, toUseCaseContext(req));
  }
  @Post()
  @Header("Cache-Control", "private, no-store")
  create(@Body() body: unknown, @Req() req: ContextAwareRequest) {
    return this.command("create", null, body, req);
  }
  @Patch(":id")
  @Header("Cache-Control", "private, no-store")
  update(@Param("id") id: string, @Body() body: unknown, @Req() req: ContextAwareRequest) {
    return this.command("update", id, body, req);
  }
  @Post(":id/complete")
  @Header("Cache-Control", "private, no-store")
  complete(@Param("id") id: string, @Body() body: unknown, @Req() req: ContextAwareRequest) {
    return this.command("complete", id, body, req);
  }
  @Post(":id/reopen")
  @Header("Cache-Control", "private, no-store")
  reopen(@Param("id") id: string, @Body() body: unknown, @Req() req: ContextAwareRequest) {
    return this.command("reopen", id, body, req);
  }
  private command(
    kind: "create" | "update" | "complete" | "reopen",
    id: string | null,
    body: unknown,
    req: ContextAwareRequest
  ) {
    return this.parse(() =>
      this.tasks.command(kind, id, body, resolveIdempotencyKey(req), toUseCaseContext(req))
    );
  }
  private async parse<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException("Invalid task request");
      }
      throw error;
    }
  }
}
