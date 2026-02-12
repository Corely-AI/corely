import {
  Body,
  Controller,
  Headers,
  Post,
  Get,
  Param,
  Req,
  Res,
  UseGuards,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import type { Response, Request } from "express";
import {
  CreateCopilotThreadRequestSchema,
  ListCopilotThreadMessagesRequestSchema,
  ListCopilotThreadsRequestSchema,
  SearchCopilotThreadsRequestSchema,
} from "@corely/contracts";
import { CopilotChatRequestDto } from "./copilot.dto";
import { StreamCopilotChatUseCase } from "../../application/use-cases/stream-copilot-chat.usecase";
import { AuthGuard as IdentityAuthGuard } from "../../../identity/adapters/http/auth.guard";
import { TenantGuard } from "./guards/tenant.guard";
import { CreateRunUseCase } from "../../application/use-cases/create-run.usecase";
import { GetRunUseCase } from "../../application/use-cases/get-run.usecase";
import { ListMessagesUseCase } from "../../application/use-cases/list-messages.usecase";
import { EnvService } from "@corely/config";
import { type CopilotMessage } from "../../domain/entities/message.entity";
import { type CopilotUIMessage } from "../../domain/types/ui-message";
import { toUseCaseContext } from "../../../../shared/request-context";
import { ListCopilotThreadsUseCase } from "../../application/use-cases/list-copilot-threads.usecase";
import { GetCopilotThreadUseCase } from "../../application/use-cases/get-copilot-thread.usecase";
import { ListCopilotThreadMessagesUseCase } from "../../application/use-cases/list-copilot-thread-messages.usecase";
import { SearchCopilotMessagesUseCase } from "../../application/use-cases/search-copilot-messages.usecase";
import { CreateCopilotThreadUseCase } from "../../application/use-cases/create-copilot-thread.usecase";

type AuthedRequest = Request & { tenantId?: string; user?: { userId?: string }; traceId?: string };

@Controller(["copilot", "ai-copilot"])
export class CopilotController {
  private readonly logger = new Logger(CopilotController.name);

  constructor(
    private readonly streamCopilotChat: StreamCopilotChatUseCase,
    private readonly createRun: CreateRunUseCase,
    private readonly getRun: GetRunUseCase,
    private readonly listMessagesUseCase: ListMessagesUseCase,
    private readonly listThreadsUseCase: ListCopilotThreadsUseCase,
    private readonly getThreadUseCase: GetCopilotThreadUseCase,
    private readonly listThreadMessagesUseCase: ListCopilotThreadMessagesUseCase,
    private readonly searchMessagesUseCase: SearchCopilotMessagesUseCase,
    private readonly createThreadUseCase: CreateCopilotThreadUseCase,
    private readonly env: EnvService
  ) {
    this.logger.debug("CopilotController instantiated");
  }

  @Get("threads/search")
  @UseGuards(IdentityAuthGuard, TenantGuard)
  async searchThreads(@Req() req: AuthedRequest) {
    const parsed = SearchCopilotThreadsRequestSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const context = this.resolveContext(req);
    return this.searchMessagesUseCase.execute({
      tenantId: context.tenantId,
      userId: context.userId,
      query: parsed.data.q,
      cursor: parsed.data.cursor,
      pageSize: parsed.data.pageSize,
    });
  }

  @Get("threads")
  @UseGuards(IdentityAuthGuard, TenantGuard)
  async listThreads(@Req() req: AuthedRequest) {
    const parsed = ListCopilotThreadsRequestSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const context = this.resolveContext(req);
    return this.listThreadsUseCase.execute({
      tenantId: context.tenantId,
      userId: context.userId,
      cursor: parsed.data.cursor,
      pageSize: parsed.data.pageSize,
      q: parsed.data.q,
    });
  }

  @Post("threads")
  @UseGuards(IdentityAuthGuard, TenantGuard)
  async createThread(@Body() body: unknown, @Req() req: AuthedRequest) {
    const parsed = CreateCopilotThreadRequestSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const context = this.resolveContext(req);
    return this.createThreadUseCase.execute({
      tenantId: context.tenantId,
      userId: context.userId,
      title: parsed.data.title,
      traceId: context.requestId,
    });
  }

  @Get("threads/:threadId")
  @UseGuards(IdentityAuthGuard, TenantGuard)
  async getThread(@Param("threadId") threadId: string, @Req() req: AuthedRequest) {
    const context = this.resolveContext(req);
    return this.getThreadUseCase.execute({
      tenantId: context.tenantId,
      userId: context.userId,
      threadId,
    });
  }

  @Get("threads/:threadId/messages")
  @UseGuards(IdentityAuthGuard, TenantGuard)
  async listThreadMessages(@Param("threadId") threadId: string, @Req() req: AuthedRequest) {
    const parsed = ListCopilotThreadMessagesRequestSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const context = this.resolveContext(req);
    return this.listThreadMessagesUseCase.execute({
      tenantId: context.tenantId,
      userId: context.userId,
      threadId,
      cursor: parsed.data.cursor,
      pageSize: parsed.data.pageSize,
    });
  }

  @Post("chat")
  @UseGuards(IdentityAuthGuard, TenantGuard)
  async chat(
    @Body() body: CopilotChatRequestDto,
    @Headers("x-idempotency-key") idempotencyKey: string,
    @Req() req: AuthedRequest,
    @Res({ passthrough: false }) res: Response
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException("Missing X-Idempotency-Key");
    }

    const context = this.resolveContext(req);
    const requestedRunId = body.threadId ?? body.id;
    if (requestedRunId) {
      await this.getThreadUseCase.execute({
        tenantId: context.tenantId,
        userId: context.userId,
        threadId: requestedRunId,
      });
    }

    return this.streamCopilotChat.execute({
      messages: body.messages || [],
      message: body.message,
      tenantId: context.tenantId,
      userId: context.userId,
      idempotencyKey,
      runId: requestedRunId,
      response: res,
      intent: body.requestData?.activeModule,
      requestId: context.requestId,
      workspaceId: context.workspaceId,
      workspaceKind: "COMPANY",
      environment: this.env.APP_ENV,
      modelId: this.env.AI_MODEL_ID,
      modelProvider: this.env.AI_MODEL_PROVIDER,
      trigger: body.trigger,
      toolTenantId: context.toolTenantId,
    });
  }

  @Post("runs")
  @UseGuards(IdentityAuthGuard, TenantGuard)
  async create(
    @Body() body: CopilotChatRequestDto,
    @Headers("x-idempotency-key") idempotencyKey: string,
    @Req() req: AuthedRequest
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException("Missing X-Idempotency-Key");
    }
    const context = this.resolveContext(req);

    const { runId } = await this.createRun.execute({
      runId: body.id,
      tenantId: context.tenantId,
      userId: context.userId,
      traceId: context.requestId,
      metadataJson: body.requestData ? JSON.stringify(body.requestData) : undefined,
    });

    return { runId, status: "running" };
  }

  @Get("runs/:id")
  @UseGuards(IdentityAuthGuard, TenantGuard)
  async get(@Param("id") id: string, @Req() req: AuthedRequest) {
    const context = this.resolveContext(req);
    const run = await this.getRun.execute({ tenantId: context.tenantId, runId: id });
    return { run };
  }

  @Get("runs/:id/messages")
  @UseGuards(IdentityAuthGuard, TenantGuard)
  async listMessages(@Param("id") id: string, @Req() req: AuthedRequest) {
    const context = this.resolveContext(req);
    const messages = await this.listMessagesUseCase.execute({
      tenantId: context.tenantId,
      runId: id,
    });
    return { items: messages };
  }

  @Get("chat/:id/stream")
  @UseGuards(IdentityAuthGuard, TenantGuard)
  async resume(@Param("id") id: string, @Req() req: AuthedRequest, @Res() res: Response) {
    const context = this.resolveContext(req);
    res.status(204).json({
      status: "NO_ACTIVE_STREAM",
      runId: id,
      tenantId: context.tenantId,
    });
  }

  @Get("chat/:id/history")
  @UseGuards(IdentityAuthGuard, TenantGuard)
  async history(@Param("id") id: string, @Req() req: AuthedRequest) {
    const context = this.resolveContext(req);
    const messages = await this.listMessagesUseCase.execute({
      tenantId: context.tenantId,
      runId: id,
    });
    return {
      items: messages.map((msg) => this.mapToUiMessage(msg)),
    };
  }

  @Post("runs/:id/messages")
  @UseGuards(IdentityAuthGuard, TenantGuard)
  async appendMessage(
    @Param("id") id: string,
    @Body() body: CopilotChatRequestDto,
    @Headers("x-idempotency-key") idempotencyKey: string,
    @Req() req: AuthedRequest,
    @Res() res: Response
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException("Missing X-Idempotency-Key");
    }
    const context = this.resolveContext(req);
    await this.getThreadUseCase.execute({
      tenantId: context.tenantId,
      userId: context.userId,
      threadId: id,
    });

    await this.streamCopilotChat.execute({
      messages: body.messages || [],
      message: body.message,
      tenantId: context.tenantId,
      userId: context.userId,
      idempotencyKey,
      runId: id,
      response: res,
      intent: body.requestData?.activeModule,
      requestId: context.requestId,
      workspaceId: context.workspaceId,
      workspaceKind: "COMPANY",
      environment: this.env.APP_ENV,
      modelId: this.env.AI_MODEL_ID,
      modelProvider: this.env.AI_MODEL_PROVIDER,
      trigger: body.trigger,
      toolTenantId: context.toolTenantId,
    });
  }

  private resolveContext(req: AuthedRequest): {
    tenantId: string;
    toolTenantId: string;
    userId: string;
    requestId: string;
    workspaceId: string;
  } {
    const ctx = toUseCaseContext(req as any);
    const tenantId = (ctx.workspaceId as string | undefined) ?? ctx.tenantId;
    const toolTenantId = ctx.tenantId ?? tenantId;
    const userId = ctx.userId || "unknown";
    const requestId = ctx.requestId || "unknown";
    const workspaceId = ctx.workspaceId ?? tenantId;

    return {
      tenantId,
      toolTenantId,
      userId,
      requestId,
      workspaceId,
    };
  }

  private mapToUiMessage(message: CopilotMessage): CopilotUIMessage {
    try {
      const parsed = JSON.parse(message.partsJson) as unknown;
      if (Array.isArray(parsed)) {
        return {
          id: message.id,
          role: message.role as CopilotUIMessage["role"],
          parts: parsed,
        };
      }
      if (typeof parsed === "object" && parsed !== null) {
        const envelope = parsed as {
          parts?: unknown;
          metadata?: Record<string, unknown>;
        };
        return {
          id: message.id,
          role: message.role as CopilotUIMessage["role"],
          parts: Array.isArray(envelope.parts) ? envelope.parts : [],
          metadata: envelope.metadata,
        };
      }
      return {
        id: message.id,
        role: message.role as CopilotUIMessage["role"],
        parts: [],
      };
    } catch {
      return {
        id: message.id,
        role: message.role as CopilotUIMessage["role"],
        parts: [],
      };
    }
  }
}
