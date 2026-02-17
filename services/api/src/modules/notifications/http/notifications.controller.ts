import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Sse,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import type { Observable } from "rxjs";
import {
  ListNotificationsRequestSchema,
  ListNotificationsResponseSchema,
  UnreadCountResponseSchema,
  MarkReadRequestSchema,
  NotificationCountChangedEvent,
  NotificationCreatedEvent,
} from "@corely/contracts";
import { buildUseCaseContext } from "../../../shared/http/usecase-mappers";
import { AuthGuard, RbacGuard } from "../../identity";
import { ListNotificationsUseCase } from "../application/use-cases/list-notifications.usecase";
import { GetUnreadCountUseCase } from "../application/use-cases/get-unread-count.usecase";
import { MarkReadUseCase } from "../application/use-cases/mark-read.usecase";
import { MarkAllReadUseCase } from "../application/use-cases/mark-all-read.usecase";
import { SseStreamFactory } from "../../../shared/sse";
import { NotificationSeverity } from "@corely/contracts";

@Controller("notifications")
@UseGuards(AuthGuard, RbacGuard)
export class NotificationsController {
  constructor(
    private readonly listNotificationsUseCase: ListNotificationsUseCase,
    private readonly getUnreadCountUseCase: GetUnreadCountUseCase,
    private readonly markReadUseCase: MarkReadUseCase,
    private readonly markAllReadUseCase: MarkAllReadUseCase,
    private readonly sseStreamFactory: SseStreamFactory,
    private readonly config: ConfigService
  ) {}

  @Get()
  async list(@Query() query: unknown, @Req() req: Request) {
    const listQuery = ListNotificationsRequestSchema.parse(query);
    const ctx = buildUseCaseContext(req);
    const result = await this.listNotificationsUseCase.execute(listQuery, ctx);

    return ListNotificationsResponseSchema.parse({
      items: result.items.map((item) => ({
        ...item,
        readAt: item.readAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
      pageInfo: result.pageInfo,
    });
  }

  @Get("unread-count")
  async getUnreadCount(@Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.getUnreadCountUseCase.execute(ctx);
    return UnreadCountResponseSchema.parse(result);
  }

  @Patch(":id/read") // or simply :id with body
  async markRead(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    // Validate request body { read: true } if needed, but endpoint implies intent
    const input = MarkReadRequestSchema.safeParse(body);
    if (!input.success && Object.keys(body || {}).length > 0) {
      // Allow empty body or correct body
    }

    const ctx = buildUseCaseContext(req);
    await this.markReadUseCase.execute(id, ctx);
    return { success: true };
  }

  // Also support PATCH /:id generic update
  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = MarkReadRequestSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    if (input.read) {
      await this.markReadUseCase.execute(id, ctx);
    }
    return { success: true };
  }

  @Post("mark-all-read")
  async markAllRead(@Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    await this.markAllReadUseCase.execute(ctx);
    return { success: true };
  }

  @Sse("stream")
  streamNotifications(@Req() req: Request): Observable<MessageEvent> {
    const ctx = buildUseCaseContext(req);

    // Create a polling stream that checks for unread count changes
    // This aligns with "existing repo SSE approach" which is polling-based
    return this.sseStreamFactory.createPollingStream<NotificationCountChangedEvent>(req, {
      event: "notifications.countChanged",
      intervalMs: 5_000,
      timeoutMs: 300_000, // 5 minutes
      fetchSnapshot: async () => {
        const { count } = await this.getUnreadCountUseCase.execute(ctx);
        return { unreadCount: count };
      },
      isComplete: () => false,
      toEnvelope: (payload) => ({
        type: "notifications.countChanged",
        unreadCount: payload.unreadCount,
      }),
      emitOnChangeOnly: true,
      hash: (snapshot) => JSON.stringify(snapshot),
    });
  }
}
