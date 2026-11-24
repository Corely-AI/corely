import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import {
  AddIssueCommentRequestSchema,
  AssignIssueRequestSchema,
  ChangeIssueStatusRequestSchema,
  CreateIssueRequestSchema,
  GetIssueRequestSchema,
  ListIssuesRequestSchema,
  ReopenIssueRequestSchema,
  ResolveIssueRequestSchema,
  SubmitServiceRequestSchema,
  SendClientUpdateSchema,
} from "@corely/contracts";
import { parseListQuery, buildPageInfo } from "@/shared/http/pagination";
import { buildUseCaseContext, resolveIdempotencyKey } from "@/shared/http/usecase-mappers";
import { AuthGuard } from "@/modules/identity/adapters/http/auth.guard";
import { RbacGuard, RequirePermission } from "@/modules/identity/adapters/http/rbac.guard";
import { GetEffectivePermissionsUseCase } from "@/modules/identity/public";
import { EntitlementGuard, RequireApp } from "@/modules/platform/public";
import { AuthorizeWorkspaceUseCase } from "@/modules/workspaces/public";
import {
  computeEffectivePermissionSet,
  hasPermission,
} from "@/shared/permissions/effective-permissions";
import { ServiceRequestsUseCase } from "../application/use-cases/service-requests.usecase";
import { CreateIssueUseCase } from "../application/use-cases/create-issue.usecase";
import { ListIssuesUseCase } from "../application/use-cases/list-issues.usecase";
import { GetIssueUseCase } from "../application/use-cases/get-issue.usecase";
import { AddIssueCommentUseCase } from "../application/use-cases/add-issue-comment.usecase";
import { ChangeIssueStatusUseCase } from "../application/use-cases/change-issue-status.usecase";
import { ResolveIssueUseCase } from "../application/use-cases/resolve-issue.usecase";
import { ReopenIssueUseCase } from "../application/use-cases/reopen-issue.usecase";
import { AssignIssueUseCase } from "../application/use-cases/assign-issue.usecase";
import {
  toIssueDto,
  toRequesterIssueDto,
  toIssueCommentDto,
  toIssueActivityDto,
} from "../application/mappers/issue-dto.mapper";

@Controller("issues")
@UseGuards(AuthGuard, RbacGuard, EntitlementGuard)
@RequireApp("issues")
export class IssuesController {
  constructor(
    private readonly createIssueUseCase: CreateIssueUseCase,
    private readonly listIssuesUseCase: ListIssuesUseCase,
    private readonly getIssueUseCase: GetIssueUseCase,
    private readonly addIssueCommentUseCase: AddIssueCommentUseCase,
    private readonly changeIssueStatusUseCase: ChangeIssueStatusUseCase,
    private readonly resolveIssueUseCase: ResolveIssueUseCase,
    private readonly reopenIssueUseCase: ReopenIssueUseCase,
    private readonly assignIssueUseCase: AssignIssueUseCase,
    private readonly requests: ServiceRequestsUseCase,
    private readonly permissions: GetEffectivePermissionsUseCase,
    private readonly workspaceAccess: AuthorizeWorkspaceUseCase
  ) {}

  @Post()
  @RequirePermission("issues.write")
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateIssueRequestSchema.parse(body);
    const ctx = buildUseCaseContext(req);

    const issue = await this.createIssueUseCase.execute(
      {
        ...input,
        idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey,
      },
      ctx
    );

    return { issue: toIssueDto(issue) };
  }

  @Post("requests")
  @RequirePermission("issues.write")
  async submitRequest(@Body() body: unknown, @Req() req: Request) {
    const issue = await this.requests.submit(
      SubmitServiceRequestSchema.parse(body),
      buildUseCaseContext(req)
    );
    return { id: issue.id };
  }

  @Post(":issueId/client-update")
  @RequirePermission("issues.resolve")
  async sendClientUpdate(
    @Param("issueId") issueId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    await this.requests.sendUpdate(
      issueId,
      SendClientUpdateSchema.parse(body),
      buildUseCaseContext(req)
    );
    return { accepted: true };
  }

  private async canOperate(ctx: ReturnType<typeof buildUseCaseContext>) {
    const { permissions } = await this.permissions.execute(ctx);
    const effective = computeEffectivePermissionSet([
      ...permissions.allowed.map((key) => ({ key, effect: "ALLOW" as const })),
      ...permissions.denied.map((key) => ({ key, effect: "DENY" as const })),
      ...(permissions.allowAll ? [{ key: "*", effect: "ALLOW" as const }] : []),
    ]);
    return hasPermission(effective, "issues.resolve") || hasPermission(effective, "issues.assign");
  }

  @Get()
  @RequirePermission("issues.read")
  async list(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const listQuery = parseListQuery(query, { defaultPageSize: 20 });
    const input = ListIssuesRequestSchema.parse({
      ...listQuery,
      status: typeof query.status === "string" ? query.status : undefined,
      priority: typeof query.priority === "string" ? query.priority : undefined,
      siteType: typeof query.siteType === "string" ? query.siteType : undefined,
      assigneeUserId: typeof query.assigneeUserId === "string" ? query.assigneeUserId : undefined,
      reporterUserId: typeof query.reporterUserId === "string" ? query.reporterUserId : undefined,
      customerPartyId:
        typeof query.customerPartyId === "string" ? query.customerPartyId : undefined,
      manufacturerPartyId:
        typeof query.manufacturerPartyId === "string" ? query.manufacturerPartyId : undefined,
      fromDate: typeof query.fromDate === "string" ? query.fromDate : undefined,
      toDate: typeof query.toDate === "string" ? query.toDate : undefined,
    });

    const ctx = buildUseCaseContext(req);
    const canOperate = await this.canOperate(ctx);
    const ownerOnly = !canOperate || query.mine === "true";
    const result = await this.listIssuesUseCase.execute(
      input,
      ctx,
      ownerOnly ? ctx.userId : undefined
    );
    const items = result.items.map((issue) =>
      canOperate ? toIssueDto(issue) : toRequesterIssueDto(issue)
    );

    return {
      items,
      canOperate,
      pageInfo: buildPageInfo(result.total, listQuery.page, listQuery.pageSize),
    };
  }

  @Get(":issueId")
  @RequirePermission("issues.read")
  async get(@Param("issueId") issueId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const input = GetIssueRequestSchema.parse({ issueId });
    const canOperate = await this.canOperate(ctx);
    const result = await this.getIssueUseCase.execute(
      input,
      ctx,
      canOperate ? undefined : ctx.userId
    );
    if (!canOperate) {
      return { issue: toRequesterIssueDto(result.issue), canOperate, comments: [], activity: [] };
    }

    const issueAttachments = result.attachments.filter((attachment) => !attachment.commentId);
    const comments = result.comments.map((comment) =>
      toIssueCommentDto(comment, result.commentAttachments.get(comment.id))
    );

    return {
      issue: toIssueDto(result.issue, issueAttachments),
      canOperate,
      comments,
      activity: result.activity.map((activity) => toIssueActivityDto(activity)),
    };
  }

  @Post(":issueId/comments")
  @RequirePermission("issues.write")
  async addComment(@Param("issueId") issueId: string, @Body() body: unknown, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    if (!(await this.canOperate(ctx))) {throw new ForbiddenException("Operator access required");}
    const input = AddIssueCommentRequestSchema.parse({
      ...(body as object),
      issueId,
    });

    const comment = await this.addIssueCommentUseCase.execute(
      {
        ...input,
        idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey,
      },
      ctx,
      true
    );

    return { comment: toIssueCommentDto(comment) };
  }

  @Post(":issueId/status")
  @RequirePermission("issues.resolve")
  async changeStatus(
    @Param("issueId") issueId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const ctx = buildUseCaseContext(req);
    const input = ChangeIssueStatusRequestSchema.parse({
      ...(body as object),
      issueId,
    });

    const issue = await this.changeIssueStatusUseCase.execute(
      {
        ...input,
        idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey,
      },
      ctx,
      true
    );

    return { issue: toIssueDto(issue) };
  }

  @Post(":issueId/resolve")
  @RequirePermission("issues.resolve")
  async resolve(@Param("issueId") issueId: string, @Body() body: unknown, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const input = ResolveIssueRequestSchema.parse({
      ...(body as object),
      issueId,
    });

    const issue = await this.resolveIssueUseCase.execute(
      {
        ...input,
        idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey,
      },
      ctx,
      true
    );

    return { issue: toIssueDto(issue) };
  }

  @Post(":issueId/reopen")
  @RequirePermission("issues.resolve")
  async reopen(@Param("issueId") issueId: string, @Body() body: unknown, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const input = ReopenIssueRequestSchema.parse({ ...(body as object), issueId });

    const issue = await this.reopenIssueUseCase.execute(
      {
        issueId,
        idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey,
        note: input.note ?? null,
      },
      ctx,
      true
    );

    return { issue: toIssueDto(issue) };
  }

  @Post(":issueId/assign")
  @RequirePermission("issues.assign")
  async assign(@Param("issueId") issueId: string, @Body() body: unknown, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const input = AssignIssueRequestSchema.parse({
      ...(body as object),
      issueId,
    });

    if (ctx.tenantId && ctx.workspaceId) {
      await this.workspaceAccess.execute({
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId,
        userId: input.assigneeUserId,
      });
    }
    const issue = await this.assignIssueUseCase.execute(
      {
        ...input,
        idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey,
      },
      ctx,
      true
    );

    return { issue: toIssueDto(issue) };
  }
}
