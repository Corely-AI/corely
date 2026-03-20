import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import {
  GetCoachingDebriefFormInputSchema,
  GetCoachingPrepFormInputSchema,
  SignCoachingContractInputSchema,
  SubmitCoachingDebriefInputSchema,
  SubmitCoachingPrepFormInputSchema,
} from "@corely/contracts";
import { mapResultToHttp } from "@/shared/http/usecase-mappers";
import { CoachingEngagementsApplication } from "../application/coaching-engagements.application";

@Controller("coaching/public")
export class CoachingEngagementsPublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly app: CoachingEngagementsApplication
  ) {}

  @Post("contracts/:engagementId/:token/sign")
  async signContract(
    @Param("engagementId") engagementId: string,
    @Param("token") token: string,
    @Body() body: unknown
  ) {
    const engagement = await this.prisma.coachingEngagement.findUnique({
      where: { id: engagementId },
      select: { tenantId: true, workspaceId: true },
    });
    const input = SignCoachingContractInputSchema.parse({
      ...(body as object),
      engagementId,
      token,
    });
    return mapResultToHttp(
      await this.app.signContract.execute(input, {
        tenantId: engagement?.tenantId,
        workspaceId: engagement?.workspaceId,
        requestId: `coaching-contract:${engagementId}`,
        correlationId: `coaching-contract:${engagementId}`,
      })
    );
  }

  @Get("prep/:sessionId/:token")
  async getPrep(@Param("sessionId") sessionId: string, @Param("token") token: string) {
    const session = await this.prisma.coachingSession.findUnique({
      where: { id: sessionId },
      select: { tenantId: true, workspaceId: true },
    });
    const input = GetCoachingPrepFormInputSchema.parse({ sessionId, token });
    return mapResultToHttp(
      await this.app.getPrepForm.execute(input, {
        tenantId: session?.tenantId,
        workspaceId: session?.workspaceId,
        requestId: `coaching-prep:${sessionId}`,
        correlationId: `coaching-prep:${sessionId}`,
      })
    );
  }

  @Post("prep/:sessionId/:token")
  async submitPrep(
    @Param("sessionId") sessionId: string,
    @Param("token") token: string,
    @Body() body: unknown
  ) {
    const session = await this.prisma.coachingSession.findUnique({
      where: { id: sessionId },
      select: { tenantId: true, workspaceId: true },
    });
    const input = SubmitCoachingPrepFormInputSchema.parse({
      ...(body as object),
      sessionId,
      token,
    });
    return mapResultToHttp(
      await this.app.submitPrepForm.execute(input, {
        tenantId: session?.tenantId,
        workspaceId: session?.workspaceId,
        requestId: `coaching-prep-submit:${sessionId}`,
        correlationId: `coaching-prep-submit:${sessionId}`,
      })
    );
  }

  @Get("debrief/:sessionId/:token")
  async getDebrief(@Param("sessionId") sessionId: string, @Param("token") token: string) {
    const session = await this.prisma.coachingSession.findUnique({
      where: { id: sessionId },
      select: { tenantId: true, workspaceId: true },
    });
    const input = GetCoachingDebriefFormInputSchema.parse({ sessionId, token });
    return mapResultToHttp(
      await this.app.getDebriefForm.execute(input, {
        tenantId: session?.tenantId,
        workspaceId: session?.workspaceId,
        requestId: `coaching-debrief:${sessionId}`,
        correlationId: `coaching-debrief:${sessionId}`,
      })
    );
  }

  @Post("debrief/:sessionId/:token")
  async submitDebrief(
    @Param("sessionId") sessionId: string,
    @Param("token") token: string,
    @Body() body: unknown
  ) {
    const session = await this.prisma.coachingSession.findUnique({
      where: { id: sessionId },
      select: { tenantId: true, workspaceId: true },
    });
    const input = SubmitCoachingDebriefInputSchema.parse({
      ...(body as object),
      sessionId,
      token,
    });
    return mapResultToHttp(
      await this.app.submitDebrief.execute(input, {
        tenantId: session?.tenantId,
        workspaceId: session?.workspaceId,
        requestId: `coaching-debrief-submit:${sessionId}`,
        correlationId: `coaching-debrief-submit:${sessionId}`,
      })
    );
  }
}
