import { Controller, Get, Header, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import {
  ResolveWebsitePublicInputSchema,
  ResolveWebsitePublicOutputSchema,
} from "@corely/contracts";
import { buildUseCaseContext, mapResultToHttp } from "@/shared/http/usecase-mappers";
import { WebsiteApplication } from "../../application/website.application";

@Controller("public/website")
export class WebsitePublicController {
  constructor(private readonly app: WebsiteApplication) {}

  @Get("resolve")
  @Header("Cache-Control", "public, max-age=30, s-maxage=120, stale-while-revalidate=60")
  async resolve(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const input = ResolveWebsitePublicInputSchema.parse({
      host: query.host,
      path: query.path,
      locale: query.locale,
      mode: query.mode ?? "live",
      token: query.token,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.resolvePublicPage.execute(input, ctx);
    return ResolveWebsitePublicOutputSchema.parse(mapResultToHttp(result));
  }
}
