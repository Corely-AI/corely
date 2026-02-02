import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
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
} from "@corely/contracts";
import { parseListQuery, buildPageInfo } from "@/shared/http/pagination";
import { buildUseCaseContext, resolveIdempotencyKey } from "@/shared/http/usecase-mappers";
import { AuthGuard, RbacGuard, RequirePermission } from "../../identity";
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
  toIssueCommentDto,
  toIssueActivityDto,
} from "../application/mappers/issue-dto.mapper";

@Controller("issues")
@UseGuards(AuthGuard, RbacGuard)
export class IssuesController {
  constructor(
    private readonly createIssueUseCase: CreateIssueUseCase,
    private readonly listIssuesUseCase: ListIssuesUseCase,
    private readonly getIssueUseCase: GetIssueUseCase,
    private readonly addIssueCommentUseCase: AddIssueCommentUseCase,
    private readonly changeIssueStatusUseCase: ChangeIssueStatusUseCase,
    private readonly resolveIssueUseCase: ResolveIssueUseCase,
    private readonly reopenIssueUseCase: ReopenIssueUseCase,
    private readonly assignIssueUseCase: AssignIssueUseCase
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
    const result = await this.listIssuesUseCase.execute(input, ctx);
    const items = result.items.map((issue) => toIssueDto(issue));

    return {
      items,
      pageInfo: buildPageInfo(result.total, listQuery.page, listQuery.pageSize),
    };
  }

  @Get(":issueId")
  @RequirePermission("issues.read")
  async get(@Param("issueId") issueId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const input = GetIssueRequestSchema.parse({ issueId });
    const result = await this.getIssueUseCase.execute(input, ctx);

    const issueAttachments = result.attachments.filter((attachment) => !attachment.commentId);
    const comments = result.comments.map((comment) =>
      toIssueCommentDto(comment, result.commentAttachments.get(comment.id))
    );

    return {
      issue: toIssueDto(result.issue, issueAttachments),
      comments,
      activity: result.activity.map((activity) => toIssueActivityDto(activity)),
    };
  }

  @Post(":issueId/comments")
  @RequirePermission("issues.write")
  async addComment(@Param("issueId") issueId: string, @Body() body: unknown, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const input = AddIssueCommentRequestSchema.parse({
      ...(body as object),
      issueId,
    });

    const comment = await this.addIssueCommentUseCase.execute(
      {
        ...input,
        idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey,
      },
      ctx
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
      ctx
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
      ctx
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
      ctx
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

    const issue = await this.assignIssueUseCase.execute(
      {
        ...input,
        idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey,
      },
      ctx
    );

    return { issue: toIssueDto(issue) };
  }
}
