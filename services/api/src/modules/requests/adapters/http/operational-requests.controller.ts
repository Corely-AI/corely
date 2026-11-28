import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { resolveIdempotencyKey } from "../../../../shared/http/usecase-mappers";
import { PrivateResponseInterceptor } from "../../../../shared/http/private-response.interceptor";
import { toUseCaseContext, type ContextAwareRequest } from "../../../../shared/request-context";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { OperationalRequestsUseCase } from "../../application/operational-requests.usecase";

@Controller("operational-requests")
@UseGuards(AuthGuard)
@UseInterceptors(PrivateResponseInterceptor)
export class OperationalRequestsController {
  constructor(
    @Inject(OperationalRequestsUseCase) private readonly requests: OperationalRequestsUseCase
  ) {}

  @Get()
  list(@Query() query: unknown, @Req() req: ContextAwareRequest) {
    return this.requests.list(query, toUseCaseContext(req));
  }

  @Get("routing")
  routes(@Req() req: ContextAwareRequest) {
    return this.requests.routes(toUseCaseContext(req));
  }

  @Post("routing/:kind")
  route(@Param("kind") kind: string, @Body() body: unknown, @Req() req: ContextAwareRequest) {
    return this.requests.configureRoute(
      kind,
      body,
      resolveIdempotencyKey(req),
      toUseCaseContext(req)
    );
  }

  @Get(":id")
  detail(@Param("id") id: string, @Req() req: ContextAwareRequest) {
    return this.requests.detail(id, toUseCaseContext(req));
  }

  @Post()
  create(@Body() body: unknown, @Req() req: ContextAwareRequest) {
    return this.command("create", "", body, req);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: unknown, @Req() req: ContextAwareRequest) {
    return this.command("update", id, body, req);
  }

  @Post(":id/submit")
  submit(@Param("id") id: string, @Body() body: unknown, @Req() req: ContextAwareRequest) {
    return this.command("submit", id, body, req);
  }

  @Post(":id/withdraw")
  withdraw(@Param("id") id: string, @Body() body: unknown, @Req() req: ContextAwareRequest) {
    return this.command("withdraw", id, body, req);
  }

  @Post(":id/attachments")
  attach(@Param("id") id: string, @Body() body: unknown, @Req() req: ContextAwareRequest) {
    return this.command("attach", id, body, req);
  }

  @Get(":id/attachments/:attachmentId/download")
  download(
    @Param("id") id: string,
    @Param("attachmentId") attachmentId: string,
    @Req() req: ContextAwareRequest
  ) {
    return this.requests.download(id, attachmentId, toUseCaseContext(req));
  }

  private command(
    kind: Parameters<OperationalRequestsUseCase["command"]>[0],
    id: string,
    body: unknown,
    req: ContextAwareRequest
  ) {
    return this.requests.command(kind, id, body, resolveIdempotencyKey(req), toUseCaseContext(req));
  }
}
