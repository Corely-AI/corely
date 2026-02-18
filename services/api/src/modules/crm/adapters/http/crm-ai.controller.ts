import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  ActivityAiExtractInputSchema,
  ActivityAiParseInputSchema,
  CommunicationAiSummarizeInputSchema,
  DraftDealMessageInputSchema,
  UpdateCrmAiSettingsInputSchema,
} from "@corely/contracts";
import { CrmApplication } from "../../application/crm.application";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";
import { AuthGuard } from "../../../identity";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";

@Controller("crm")
@UseGuards(AuthGuard, RbacGuard)
export class CrmAiHttpController {
  constructor(private readonly app: CrmApplication) {}

  @Get("deals/:id/ai/insights")
  @RequirePermission("crm.deals.read")
  async getDealInsights(
    @Param("id") dealId: string,
    @Query("refresh") refresh: string | undefined,
    @Req() req: Request
  ) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getDealAiInsights.execute(
      {
        dealId,
        forceRefresh: refresh === "1" || refresh === "true",
      },
      ctx
    );
    return mapResultToHttp(result);
  }

  @Get("deals/:id/ai/recommendations")
  @RequirePermission("crm.deals.read")
  async getDealRecommendations(
    @Param("id") dealId: string,
    @Query("refresh") refresh: string | undefined,
    @Req() req: Request
  ) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getDealAiRecommendations.execute(
      {
        dealId,
        forceRefresh: refresh === "1" || refresh === "true",
      },
      ctx
    );
    return mapResultToHttp(result);
  }

  @Post("deals/:id/ai/draft-message")
  @RequirePermission("crm.deals.read")
  async draftDealMessage(@Param("id") dealId: string, @Body() body: unknown, @Req() req: Request) {
    const input = DraftDealMessageInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.draftDealAiMessage.execute({ ...input, dealId }, ctx);
    return mapResultToHttp(result);
  }

  @Post("activities/ai/parse")
  @RequirePermission("crm.activities.manage")
  async parseActivity(@Body() body: unknown, @Req() req: Request) {
    const input = ActivityAiParseInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.parseActivityAi.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("activities/ai/extract")
  @RequirePermission("crm.activities.manage")
  async extractActivity(@Body() body: unknown, @Req() req: Request) {
    const input = ActivityAiExtractInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.extractActivityAi.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("comms/ai/summarize")
  @RequirePermission("crm.activities.manage")
  async summarizeCommunication(@Body() body: unknown, @Req() req: Request) {
    const input = CommunicationAiSummarizeInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.summarizeCommunicationAi.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("ai/settings")
  @RequirePermission("crm.deals.read")
  async getSettings(@Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getCrmAiSettings.execute(undefined, ctx);
    return mapResultToHttp(result);
  }

  @Patch("ai/settings")
  @RequirePermission("crm.deals.manage")
  async updateSettings(@Body() body: unknown, @Req() req: Request) {
    const input = UpdateCrmAiSettingsInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateCrmAiSettings.execute(input, ctx);
    return mapResultToHttp(result);
  }
}
