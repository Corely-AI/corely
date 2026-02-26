import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  type GetWebsiteExternalContentDraftInput,
  GetWebsiteExternalContentDraftInputSchema,
  type PatchWebsiteExternalContentDraftInput,
  PatchWebsiteExternalContentDraftInputSchema,
  type PublishWebsiteExternalContentInput,
  PublishWebsiteExternalContentInputSchema,
  WebsiteExternalContentOutputSchema,
} from "@corely/contracts";
import { buildUseCaseContext, mapResultToHttp } from "@/shared/http/usecase-mappers";
import { AuthGuard } from "@/modules/identity";
import { WebsiteApplication } from "../../application/website.application";

@Controller("website/sites")
@UseGuards(AuthGuard)
export class WebsiteExternalContentController {
  constructor(private readonly app: WebsiteApplication) {}

  @Get(":siteId/external-content/draft")
  async getDraft(
    @Param("siteId") siteId: string,
    @Query() query: Record<string, unknown>,
    @Req() req: Request
  ) {
    const input: GetWebsiteExternalContentDraftInput =
      GetWebsiteExternalContentDraftInputSchema.parse({
        key: query.key,
        locale: query.locale,
      });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getExternalContentDraft.execute(
      {
        siteId,
        key: input.key as "siteCopy",
        locale: input.locale,
      },
      ctx
    );
    return WebsiteExternalContentOutputSchema.parse(mapResultToHttp(result));
  }

  @Patch(":siteId/external-content/draft")
  async patchDraft(@Param("siteId") siteId: string, @Body() body: unknown, @Req() req: Request) {
    const input: PatchWebsiteExternalContentDraftInput =
      PatchWebsiteExternalContentDraftInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.patchExternalContentDraft.execute(
      {
        siteId,
        key: input.key as "siteCopy",
        locale: input.locale,
        data: input.data,
      },
      ctx
    );
    return WebsiteExternalContentOutputSchema.parse(mapResultToHttp(result));
  }

  @Post(":siteId/external-content/publish")
  async publish(@Param("siteId") siteId: string, @Body() body: unknown, @Req() req: Request) {
    const input: PublishWebsiteExternalContentInput =
      PublishWebsiteExternalContentInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.publishExternalContent.execute(
      {
        siteId,
        key: input.key as "siteCopy",
        locale: input.locale,
      },
      ctx
    );
    return WebsiteExternalContentOutputSchema.parse(mapResultToHttp(result));
  }
}
