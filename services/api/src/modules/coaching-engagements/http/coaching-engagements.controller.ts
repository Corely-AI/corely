import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { type ContextAwareRequest } from "@/shared/request-context";
import { buildUseCaseContext, mapResultToHttp } from "@/shared/http/usecase-mappers";
import {
  BookCoachingEngagementInputSchema,
  CompleteCoachingSessionInputSchema,
  CreateCoachingCheckoutSessionInputSchema,
  GenerateCoachingExportBundleInputSchema,
  GetCoachingArtifactSummaryInputSchema,
  GetCoachingEngagementInputSchema,
  ListCoachingEngagementsInputSchema,
  ListCoachingSessionsInputSchema,
} from "@corely/contracts";
import { AuthGuard } from "../../identity";
import { CoachingEngagementsApplication } from "../application/coaching-engagements.application";

@Controller()
@UseGuards(AuthGuard)
export class CoachingEngagementsController {
  constructor(private readonly app: CoachingEngagementsApplication) {}

  @Post("coaching-engagements")
  async book(@Body() body: unknown, @Req() req: ContextAwareRequest) {
    const input = BookCoachingEngagementInputSchema.parse(body);
    return mapResultToHttp(await this.app.bookEngagement.execute(input, buildUseCaseContext(req)));
  }

  @Get("coaching-engagements")
  async listEngagements(@Query() query: unknown, @Req() req: ContextAwareRequest) {
    const input = ListCoachingEngagementsInputSchema.parse(query);
    return mapResultToHttp(await this.app.listEngagements.execute(input, buildUseCaseContext(req)));
  }

  @Get("coaching-sessions")
  async listSessions(@Query() query: unknown, @Req() req: ContextAwareRequest) {
    const input = ListCoachingSessionsInputSchema.parse(query);
    return mapResultToHttp(await this.app.listSessions.execute(input, buildUseCaseContext(req)));
  }

  @Get("coaching-engagements/:engagementId")
  async get(@Param("engagementId") engagementId: string, @Req() req: ContextAwareRequest) {
    const input = GetCoachingEngagementInputSchema.parse({ engagementId });
    return mapResultToHttp(await this.app.getEngagement.execute(input, buildUseCaseContext(req)));
  }

  @Post("coaching-engagements/:engagementId/checkout")
  async createCheckout(
    @Param("engagementId") engagementId: string,
    @Body() body: unknown,
    @Req() req: ContextAwareRequest
  ) {
    const input = CreateCoachingCheckoutSessionInputSchema.parse({
      ...(body as object),
      engagementId,
    });
    return mapResultToHttp(
      await this.app.createCheckoutSession.execute(input, buildUseCaseContext(req))
    );
  }

  @Post("coaching-sessions/:sessionId/complete")
  async completeSession(
    @Param("sessionId") sessionId: string,
    @Body() body: unknown,
    @Req() req: ContextAwareRequest
  ) {
    const input = CompleteCoachingSessionInputSchema.parse({ ...(body as object), sessionId });
    return mapResultToHttp(await this.app.completeSession.execute(input, buildUseCaseContext(req)));
  }

  @Post("coaching-engagements/:engagementId/export")
  async exportBundle(
    @Param("engagementId") engagementId: string,
    @Body() body: unknown,
    @Req() req: ContextAwareRequest
  ) {
    const input = GenerateCoachingExportBundleInputSchema.parse({
      ...(body as object),
      engagementId,
    });
    return mapResultToHttp(
      await this.app.generateExportBundle.execute(input, buildUseCaseContext(req))
    );
  }

  @Get("coaching-engagements/:engagementId/summary")
  async summary(@Param("engagementId") engagementId: string, @Req() req: ContextAwareRequest) {
    const input = GetCoachingArtifactSummaryInputSchema.parse({ engagementId });
    return mapResultToHttp(
      await this.app.getArtifactSummary.execute(input, buildUseCaseContext(req))
    );
  }
}
