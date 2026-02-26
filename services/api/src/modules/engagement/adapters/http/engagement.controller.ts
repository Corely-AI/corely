import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { isErr } from "@corely/kernel";
import {
  CancelCheckInEventInputSchema,
  CompleteCheckInEventInputSchema,
  ConsumeCustomerPackageInputSchema,
  CreateCheckInEventInputSchema,
  CreateCustomerPackageInputSchema,
  CreateLoyaltyAdjustEntryInputSchema,
  CreateLoyaltyEarnEntryInputSchema,
  CreateLoyaltyRedeemEntryInputSchema,
  GetEngagementSettingsInputSchema,
  GetLoyaltySummaryInputSchema,
  ListCheckInEventsInputSchema,
  ListCustomerPackagesInputSchema,
  ListLoyaltyLedgerInputSchema,
  ListPackageUsageInputSchema,
  ListUpcomingBirthdaysInputSchema,
  UpdateEngagementSettingsInputSchema,
} from "@corely/contracts";
import {
  buildUseCaseContext,
  resolveIdempotencyKey,
} from "../../../../shared/http/usecase-mappers";
import { AuthGuard } from "../../../identity";
import { EngagementApplication } from "../../application/engagement.application";
import { toHttpException } from "../../../../shared/http/usecase-error.mapper";

@ApiTags("Engagement")
@ApiBearerAuth()
@Controller("engagement")
@UseGuards(AuthGuard)
export class EngagementController {
  constructor(private readonly app: EngagementApplication) {}

  @Post("checkins")
  async createCheckIn(@Body() body: unknown, @Req() req: Request) {
    const input = CreateCheckInEventInputSchema.parse(body);
    const result = await this.app.createCheckIn.execute(input, buildUseCaseContext(req as any));
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Get("checkins")
  async listCheckIns(@Query() query: Record<string, string | undefined>, @Req() req: Request) {
    const input = ListCheckInEventsInputSchema.parse({
      customerPartyId: query.customerPartyId,
      registerId: query.registerId,
      status: query.status,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const result = await this.app.listCheckIns.execute(input, buildUseCaseContext(req as any));
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Post("checkins/:id/complete")
  async completeCheckIn(@Param("id") id: string, @Req() req: Request) {
    const input = CompleteCheckInEventInputSchema.parse({ checkInEventId: id });
    const result = await this.app.completeCheckIn.execute(input, buildUseCaseContext(req as any));
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Post("checkins/:id/cancel")
  async cancelCheckIn(
    @Param("id") id: string,
    @Body() body: { reason?: string } | undefined,
    @Req() req: Request
  ) {
    const input = CancelCheckInEventInputSchema.parse({
      checkInEventId: id,
      reason: body?.reason,
    });
    const result = await this.app.cancelCheckIn.execute(input, buildUseCaseContext(req as any));
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Get("loyalty/:customerPartyId")
  async getLoyalty(@Param("customerPartyId") customerPartyId: string, @Req() req: Request) {
    const input = GetLoyaltySummaryInputSchema.parse({ customerPartyId });
    const result = await this.app.getLoyaltySummary.execute(input, buildUseCaseContext(req as any));
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Get("loyalty/:customerPartyId/ledger")
  async listLoyaltyLedger(
    @Param("customerPartyId") customerPartyId: string,
    @Query() query: Record<string, string | undefined>,
    @Req() req: Request
  ) {
    const input = ListLoyaltyLedgerInputSchema.parse({
      customerPartyId,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const result = await this.app.listLoyaltyLedger.execute(input, buildUseCaseContext(req as any));
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Post("loyalty/earn")
  async createLoyaltyEarn(@Body() body: unknown, @Req() req: Request) {
    const idempotencyKey = resolveIdempotencyKey(req as any);
    if (!idempotencyKey) {
      throw new BadRequestException("Missing X-Idempotency-Key");
    }
    const input = CreateLoyaltyEarnEntryInputSchema.parse({
      ...(body as Record<string, unknown>),
      idempotencyKey,
    });
    const result = await this.app.createLoyaltyEarn.execute(input, buildUseCaseContext(req as any));
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Post("loyalty/adjust")
  async createLoyaltyAdjust(@Body() body: unknown, @Req() req: Request) {
    const idempotencyKey = resolveIdempotencyKey(req as any);
    if (!idempotencyKey) {
      throw new BadRequestException("Missing X-Idempotency-Key");
    }
    const input = CreateLoyaltyAdjustEntryInputSchema.parse({
      ...(body as Record<string, unknown>),
      idempotencyKey,
    });
    const result = await this.app.createLoyaltyAdjust.execute(
      input,
      buildUseCaseContext(req as any)
    );
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Post("loyalty/redeem")
  async createLoyaltyRedeem(@Body() body: unknown, @Req() req: Request) {
    const idempotencyKey = resolveIdempotencyKey(req as any);
    if (!idempotencyKey) {
      throw new BadRequestException("Missing X-Idempotency-Key");
    }
    const input = CreateLoyaltyRedeemEntryInputSchema.parse({
      ...(body as Record<string, unknown>),
      idempotencyKey,
    });
    const result = await this.app.createLoyaltyRedeem.execute(
      input,
      buildUseCaseContext(req as any)
    );
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Post("packages")
  async createCustomerPackage(@Body() body: unknown, @Req() req: Request) {
    const idempotencyKey = resolveIdempotencyKey(req as any);
    if (!idempotencyKey) {
      throw new BadRequestException("Missing X-Idempotency-Key");
    }
    const input = CreateCustomerPackageInputSchema.parse({
      ...(body as Record<string, unknown>),
      idempotencyKey,
    });
    const result = await this.app.createCustomerPackage.execute(
      input,
      buildUseCaseContext(req as any)
    );
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Get("packages")
  async listCustomerPackages(
    @Query() query: Record<string, string | undefined>,
    @Req() req: Request
  ) {
    const input = ListCustomerPackagesInputSchema.parse({
      customerPartyId: query.customerPartyId,
      status: query.status,
      includeInactive:
        query.includeInactive === undefined ? undefined : query.includeInactive === "true",
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const result = await this.app.listCustomerPackages.execute(
      input,
      buildUseCaseContext(req as any)
    );
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Post("packages/:customerPackageId/consume")
  async consumeCustomerPackage(
    @Param("customerPackageId") customerPackageId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const idempotencyKey = resolveIdempotencyKey(req as any);
    if (!idempotencyKey) {
      throw new BadRequestException("Missing X-Idempotency-Key");
    }
    const input = ConsumeCustomerPackageInputSchema.parse({
      ...(body as Record<string, unknown>),
      customerPackageId,
      idempotencyKey,
    });
    const result = await this.app.consumeCustomerPackage.execute(
      input,
      buildUseCaseContext(req as any)
    );
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Get("packages/:customerPackageId/usage")
  async listPackageUsage(
    @Param("customerPackageId") customerPackageId: string,
    @Query() query: Record<string, string | undefined>,
    @Req() req: Request
  ) {
    const input = ListPackageUsageInputSchema.parse({
      customerPackageId,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const result = await this.app.listPackageUsage.execute(input, buildUseCaseContext(req as any));
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Get("birthdays/upcoming")
  async listUpcomingBirthdays(
    @Query() query: Record<string, string | undefined>,
    @Req() req: Request
  ) {
    const input = ListUpcomingBirthdaysInputSchema.parse({
      from: query.from,
      to: query.to,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const result = await this.app.listUpcomingBirthdays.execute(
      input,
      buildUseCaseContext(req as any)
    );
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Get("settings")
  async getSettings(@Req() req: Request) {
    const input = GetEngagementSettingsInputSchema.parse({});
    const result = await this.app.getSettings.execute(input, buildUseCaseContext(req as any));
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Patch("settings")
  async updateSettings(@Body() body: unknown, @Req() req: Request) {
    const input = UpdateEngagementSettingsInputSchema.parse(body);
    const result = await this.app.updateSettings.execute(input, buildUseCaseContext(req as any));
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }
}
