import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { type ContextAwareRequest } from "@/shared/request-context";
import { buildUseCaseContext, mapResultToHttp } from "@/shared/http/usecase-mappers";
import {
  BookCoachingEngagementInputSchema,
  CancelCoachingSessionInputSchema,
  CompleteCoachingSessionInputSchema,
  CreateCoachingCheckoutSessionInputSchema,
  GenerateCoachingExportBundleInputSchema,
  GetCoachingArtifactSummaryInputSchema,
  GetCoachingEngagementInputSchema,
  ListCoachingEngagementsInputSchema,
  ListCoachingSessionsInputSchema,
  ResendCoachingInvoiceInputSchema,
  RefundCoachingPaymentInputSchema,
} from "@corely/contracts";
import { AuthGuard } from "../../identity";
import { CoachingEngagementsApplication } from "../application/coaching-engagements.application";
import { PrismaCoachingEngagementRepositoryAdapter } from "../infrastructure/persist/prisma-coaching-engagement-repository.adapter";
import { toCoachingSessionDto } from "../application/mappers/coaching-dto.mapper";

@Controller()
@UseGuards(AuthGuard)
export class CoachingEngagementsController {
  constructor(
    private readonly app: CoachingEngagementsApplication,
    private readonly repo: PrismaCoachingEngagementRepositoryAdapter
  ) {}

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

  @Post("coaching-engagements/:engagementId/refund")
  async refundPayment(
    @Param("engagementId") engagementId: string,
    @Body() body: unknown,
    @Req() req: ContextAwareRequest
  ) {
    const input = RefundCoachingPaymentInputSchema.parse({
      ...(body as object),
      engagementId,
    });
    return mapResultToHttp(await this.app.refundPayment.execute(input, buildUseCaseContext(req)));
  }

  @Post("coaching-engagements/:engagementId/invoice/resend")
  async resendInvoice(
    @Param("engagementId") engagementId: string,
    @Body() body: unknown,
    @Req() req: ContextAwareRequest
  ) {
    const input = ResendCoachingInvoiceInputSchema.parse({
      ...(body as object),
      engagementId,
    });
    return mapResultToHttp(await this.app.resendInvoice.execute(input, buildUseCaseContext(req)));
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

  @Post("coaching-sessions/:sessionId/cancel")
  async cancelSession(
    @Param("sessionId") sessionId: string,
    @Body() body: unknown,
    @Req() req: ContextAwareRequest
  ) {
    const input = CancelCoachingSessionInputSchema.parse({ ...(body as object), sessionId });
    const ctx = buildUseCaseContext(req);
    if (!ctx.tenantId || !ctx.workspaceId) {
      throw new NotFoundException("Workspace context is required");
    }
    const session = await this.repo.findSessionById(ctx.tenantId, ctx.workspaceId, input.sessionId);
    if (!session) {
      throw new NotFoundException("Coaching session not found");
    }
    const updated = await this.repo.updateSession({
      ...session,
      status: "cancelled",
      updatedAt: new Date(),
    });
    return { session: toCoachingSessionDto(updated) };
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
