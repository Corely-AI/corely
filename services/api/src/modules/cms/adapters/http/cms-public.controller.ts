import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import {
  CreateCmsCommentInputSchema,
  GetPublicCmsPostInputSchema,
  ListPublicCmsPostsInputSchema,
  ListPublicCmsCommentsInputSchema,
} from "@corely/contracts";
import { parseListQuery } from "../../../../shared/http/pagination";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";
import { CmsApplication } from "../../application/cms.application";
import { CmsReaderAuthGuard } from "./cms-reader-auth.guard";

type CmsReaderRequest = Request & {
  cmsReader?: {
    readerId: string;
  };
};

@Controller("public/cms")
export class CmsPublicController {
  constructor(private readonly app: CmsApplication) {}

  @Get("posts")
  async listPosts(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const listQuery = parseListQuery(query, { defaultPageSize: 20 });
    const input = ListPublicCmsPostsInputSchema.parse({
      q: listQuery.q,
      page: listQuery.page,
      pageSize: listQuery.pageSize,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listPublicPosts.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("posts/:slug")
  async getPost(@Param("slug") slug: string, @Req() req: Request) {
    const input = GetPublicCmsPostInputSchema.parse({ slug });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getPublicPost.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("posts/:slug/comments")
  async listComments(
    @Param("slug") slug: string,
    @Query() query: Record<string, unknown>,
    @Req() req: Request
  ) {
    const listQuery = parseListQuery(query, { defaultPageSize: 20 });
    const input = ListPublicCmsCommentsInputSchema.parse({
      page: listQuery.page,
      pageSize: listQuery.pageSize,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listPublicComments.execute({ ...input, slug }, ctx);
    return mapResultToHttp(result);
  }

  @Post("posts/:slug/comments")
  @UseGuards(CmsReaderAuthGuard)
  async createComment(
    @Param("slug") slug: string,
    @Body() body: unknown,
    @Req() req: CmsReaderRequest
  ) {
    const input = CreateCmsCommentInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const readerId = req.cmsReader?.readerId;
    if (!readerId) {
      throw new UnauthorizedException("Reader not authenticated");
    }
    const result = await this.app.createComment.execute({ ...input, slug, readerId }, ctx);
    return mapResultToHttp(result);
  }
}
