import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { type ContextAwareRequest } from "@/shared/request-context";
import { RequireTenant } from "@corely/kernel";
import {
  ArchiveCoachingOfferInputSchema,
  CreateCoachingOfferInputSchema,
  GetCoachingOfferInputSchema,
  ListCoachingOffersInputSchema,
  UpdateCoachingOfferInputSchema,
} from "@corely/contracts";
import {
  buildUseCaseContext,
  mapResultToHttp,
  resolveIdempotencyKey,
} from "@/shared/http/usecase-mappers";
import { AuthGuard } from "../../identity";
import { RbacGuard, RequirePermission } from "../../identity/adapters/http/rbac.guard";
import { CoachingEngagementsApplication } from "../application/coaching-engagements.application";

@Controller()
@UseGuards(AuthGuard, RbacGuard)
@RequireTenant()
export class CoachingOffersController {
  constructor(private readonly app: CoachingEngagementsApplication) {}

  @Post("coaching-offers")
  @RequirePermission("coaching.engagements.manage")
  async create(@Body() body: unknown, @Req() req: ContextAwareRequest) {
    const input = CreateCoachingOfferInputSchema.parse({
      ...(body as object),
      idempotencyKey: resolveIdempotencyKey(req) ?? (body as any)?.idempotencyKey,
    });
    return mapResultToHttp(await this.app.createOffer.execute(input, buildUseCaseContext(req)));
  }

  @Get("coaching-offers")
  @RequirePermission("coaching.engagements.read")
  async list(@Query() query: unknown, @Req() req: ContextAwareRequest) {
    const input = ListCoachingOffersInputSchema.parse(query);
    return mapResultToHttp(await this.app.listOffers.execute(input, buildUseCaseContext(req)));
  }

  @Get("coaching-offers/:offerId")
  @RequirePermission("coaching.engagements.read")
  async get(@Param("offerId") offerId: string, @Req() req: ContextAwareRequest) {
    const input = GetCoachingOfferInputSchema.parse({ offerId });
    return mapResultToHttp(await this.app.getOffer.execute(input, buildUseCaseContext(req)));
  }

  @Patch("coaching-offers/:offerId")
  @RequirePermission("coaching.engagements.manage")
  async update(
    @Param("offerId") offerId: string,
    @Body() body: unknown,
    @Req() req: ContextAwareRequest
  ) {
    const input = {
      offerId,
      ...UpdateCoachingOfferInputSchema.parse(body),
    };
    return mapResultToHttp(await this.app.updateOffer.execute(input, buildUseCaseContext(req)));
  }

  @Post("coaching-offers/:offerId/archive")
  @RequirePermission("coaching.engagements.manage")
  async archive(@Param("offerId") offerId: string, @Req() req: ContextAwareRequest) {
    const input = ArchiveCoachingOfferInputSchema.parse({ offerId });
    return mapResultToHttp(await this.app.archiveOffer.execute(input, buildUseCaseContext(req)));
  }
}
