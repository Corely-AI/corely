import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ZodError } from "zod";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { toUseCaseContext, type ContextAwareRequest } from "../../../../shared/request-context";
import { resolveIdempotencyKey } from "../../../../shared/http/usecase-mappers";
import { RecurringChecklistsUseCase } from "../../application/recurring-checklists.usecase";
@Controller("tasks/recurring")
@UseGuards(AuthGuard)
export class RecurringChecklistsController {
  constructor(
    @Inject(RecurringChecklistsUseCase) private readonly templates: RecurringChecklistsUseCase
  ) {}
  @Get()
  @Header("Cache-Control", "private, no-store")
  list(@Query() query: unknown, @Req() req: ContextAwareRequest) {
    return this.parse(() => this.templates.list(query, toUseCaseContext(req)));
  }
  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  detail(@Param("id") id: string, @Req() req: ContextAwareRequest) {
    return this.templates.detail(id, toUseCaseContext(req));
  }
  @Post()
  @Header("Cache-Control", "private, no-store")
  publish(@Body() body: unknown, @Req() req: ContextAwareRequest) {
    return this.run("publish", null, body, req);
  }
  @Post(":id/:action")
  @Header("Cache-Control", "private, no-store")
  action(
    @Param("id") id: string,
    @Param("action") action: string,
    @Body() body: unknown,
    @Req() req: ContextAwareRequest
  ) {
    if (!["edit", "pause", "resume", "end", "skip", "generate"].includes(action)) {
      throw new BadRequestException("Unknown checklist action");
    }
    return this.run(
      action as "edit" | "pause" | "resume" | "end" | "skip" | "generate",
      id,
      body,
      req
    );
  }
  private run(
    kind: "publish" | "edit" | "pause" | "resume" | "end" | "skip" | "generate",
    id: string | null,
    body: unknown,
    req: ContextAwareRequest
  ) {
    return this.parse(() =>
      this.templates.command(kind, id, body, resolveIdempotencyKey(req), toUseCaseContext(req))
    );
  }
  private async parse<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException("Invalid checklist request");
      }
      throw error;
    }
  }
}
