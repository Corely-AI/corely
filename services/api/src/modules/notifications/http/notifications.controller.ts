import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  ListNotificationsRequestSchema,
  ListNotificationsResponseSchema,
  UnreadCountResponseSchema,
  MarkReadRequestSchema,
} from "@corely/contracts";
import { buildUseCaseContext } from "../../../shared/http/usecase-mappers";
import { AuthGuard } from "@/modules/identity/adapters/http/auth.guard";
import { RbacGuard } from "@/modules/identity/adapters/http/rbac.guard";
import { ListNotificationsUseCase } from "../application/use-cases/list-notifications.usecase";
import { GetUnreadCountUseCase } from "../application/use-cases/get-unread-count.usecase";
import { MarkReadUseCase } from "../application/use-cases/mark-read.usecase";
import { MarkAllReadUseCase } from "../application/use-cases/mark-all-read.usecase";

@Controller("notifications")
@UseGuards(AuthGuard, RbacGuard)
export class NotificationsController {
  constructor(
    private readonly listNotificationsUseCase: ListNotificationsUseCase,
    private readonly getUnreadCountUseCase: GetUnreadCountUseCase,
    private readonly markReadUseCase: MarkReadUseCase,
    private readonly markAllReadUseCase: MarkAllReadUseCase
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
}
