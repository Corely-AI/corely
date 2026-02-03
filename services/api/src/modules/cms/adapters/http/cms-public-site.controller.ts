import { Controller, Get, Header, Param, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import {
  GetPublicCmsPostOutputSchema,
  ListPublicCmsPostsInputSchema,
  ListPublicCmsPostsOutputSchema,
} from "@corely/contracts";
import { parseListQuery } from "../../../../shared/http/pagination";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";
import { PublicWorkspaceRoute } from "../../../../shared/public";
import { CmsApplication } from "../../application/cms.application";

@Controller("public")
@PublicWorkspaceRoute()
export class CmsPublicSiteController {
  constructor(private readonly app: CmsApplication) {}

  @Get("blog")
  @Header("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=120")
  async listBlog(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const listQuery = parseListQuery(query, { defaultPageSize: 20 });
    const input = ListPublicCmsPostsInputSchema.parse({
      q: listQuery.q,
      page: listQuery.page,
      pageSize: listQuery.pageSize,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listPublicPosts.execute(input, ctx);
    return ListPublicCmsPostsOutputSchema.parse(mapResultToHttp(result));
  }

  @Get("blog/:slug")
  @Header("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=120")
  async getBlogPost(@Param("slug") slug: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getPublicPost.execute({ slug }, ctx);
    return GetPublicCmsPostOutputSchema.parse(mapResultToHttp(result));
  }

  @Get("pages/:slug")
  @Header("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=120")
  async getPage(@Param("slug") slug: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getPublicPost.execute({ slug }, ctx);
    return GetPublicCmsPostOutputSchema.parse(mapResultToHttp(result));
  }
}
