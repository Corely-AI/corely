import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  CreateCmsPostInputSchema,
  GetCmsPostInputSchema,
  ListCmsPostsInputSchema,
  UpdateCmsPostContentInputSchema,
  UpdateCmsPostInputSchema,
} from "@corely/contracts";
import { parseListQuery } from "../../../../shared/http/pagination";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";
import { AuthGuard } from "../../../identity";
import { CmsApplication } from "../../application/cms.application";

@Controller("cms/posts")
@UseGuards(AuthGuard)
export class CmsPostsController {
  constructor(private readonly app: CmsApplication) {}

  @Get()
  async list(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const listQuery = parseListQuery(query, { defaultPageSize: 20 });
    const input = ListCmsPostsInputSchema.parse({
      status: typeof query.status === "string" ? query.status : undefined,
      q: listQuery.q,
      page: listQuery.page,
      pageSize: listQuery.pageSize,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listPosts.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateCmsPostInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createPost.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get(":postId")
  async getOne(@Param("postId") postId: string, @Req() req: Request) {
    const input = GetCmsPostInputSchema.parse({ postId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getPost.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Put(":postId")
  async update(@Param("postId") postId: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateCmsPostInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updatePost.execute({ ...input, postId }, ctx);
    return mapResultToHttp(result);
  }

  @Put(":postId/content")
  async updateContent(@Param("postId") postId: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateCmsPostContentInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updatePostContent.execute({ ...input, postId }, ctx);
    return mapResultToHttp(result);
  }

  @Post(":postId/publish")
  async publish(@Param("postId") postId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.publishPost.execute({ postId }, ctx);
    return mapResultToHttp(result);
  }

  @Post(":postId/unpublish")
  async unpublish(@Param("postId") postId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.unpublishPost.execute({ postId }, ctx);
    return mapResultToHttp(result);
  }
}
