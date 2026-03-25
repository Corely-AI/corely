import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  CloseRestaurantTableInputSchema,
  DecideRestaurantApprovalInputSchema,
  GetActiveRestaurantOrderInputSchema,
  GetRestaurantFloorPlanInputSchema,
  ListKitchenStationsInputSchema,
  ListKitchenTicketsInputSchema,
  ListRestaurantModifierGroupsInputSchema,
  MergeRestaurantChecksInputSchema,
  OpenRestaurantTableInputSchema,
  PutRestaurantDraftOrderInputSchema,
  RequestRestaurantDiscountInputSchema,
  RequestRestaurantVoidInputSchema,
  SendRestaurantOrderToKitchenInputSchema,
  TransferRestaurantTableInputSchema,
  UpdateKitchenTicketStatusInputSchema,
  UpsertDiningRoomInputSchema,
  UpsertKitchenStationInputSchema,
  UpsertRestaurantModifierGroupInputSchema,
  UpsertRestaurantTableInputSchema,
} from "@corely/contracts";
import { AuthGuard } from "@/modules/identity/adapters/http/auth.guard";
import { AllowSurfaces } from "@/shared/surface";
import { buildUseCaseContext, resolveIdempotencyKey } from "../../../shared/http/usecase-mappers";
import { RestaurantApplication } from "../application/restaurant.application";

@AllowSurfaces("platform", "pos")
@Controller("restaurant")
@UseGuards(AuthGuard)
export class RestaurantController {
  constructor(private readonly app: RestaurantApplication) {}

  @Get("floor-plan")
  async getFloorPlan(@Query() query: unknown, @Req() req: Request) {
    return this.app.getFloorPlan(
      GetRestaurantFloorPlanInputSchema.parse(query),
      buildUseCaseContext(req as never)
    );
  }

  @Post("dining-rooms")
  async upsertDiningRoom(@Body() body: unknown, @Req() req: Request) {
    return this.app.upsertDiningRoom(
      UpsertDiningRoomInputSchema.parse({
        ...(body as object),
        idempotencyKey:
          (body as Record<string, unknown>)?.idempotencyKey ?? resolveIdempotencyKey(req as never),
      }),
      buildUseCaseContext(req as never)
    );
  }

  @Post("tables")
  async upsertTable(@Body() body: unknown, @Req() req: Request) {
    return this.app.upsertTable(
      UpsertRestaurantTableInputSchema.parse({
        ...(body as object),
        idempotencyKey:
          (body as Record<string, unknown>)?.idempotencyKey ?? resolveIdempotencyKey(req as never),
      }),
      buildUseCaseContext(req as never)
    );
  }

  @Get("modifier-groups")
  async listModifierGroups(@Query() query: unknown, @Req() req: Request) {
    return this.app.listModifierGroups(
      ListRestaurantModifierGroupsInputSchema.parse(query),
      buildUseCaseContext(req as never)
    );
  }

  @Post("modifier-groups")
  async upsertModifierGroup(@Body() body: unknown, @Req() req: Request) {
    return this.app.upsertModifierGroup(
      UpsertRestaurantModifierGroupInputSchema.parse({
        ...(body as object),
        idempotencyKey:
          (body as Record<string, unknown>)?.idempotencyKey ?? resolveIdempotencyKey(req as never),
      }),
      buildUseCaseContext(req as never)
    );
  }

  @Get("kitchen-stations")
  async listKitchenStations(@Query() query: unknown, @Req() req: Request) {
    return this.app.listKitchenStations(
      ListKitchenStationsInputSchema.parse(query),
      buildUseCaseContext(req as never)
    );
  }

  @Post("kitchen-stations")
  async upsertKitchenStation(@Body() body: unknown, @Req() req: Request) {
    return this.app.upsertKitchenStation(
      UpsertKitchenStationInputSchema.parse({
        ...(body as object),
        idempotencyKey:
          (body as Record<string, unknown>)?.idempotencyKey ?? resolveIdempotencyKey(req as never),
      }),
      buildUseCaseContext(req as never)
    );
  }

  @Post("tables/open")
  async openTable(@Body() body: unknown, @Req() req: Request) {
    return this.app.openTable(
      OpenRestaurantTableInputSchema.parse({
        ...(body as object),
        idempotencyKey:
          (body as Record<string, unknown>)?.idempotencyKey ?? resolveIdempotencyKey(req as never),
      }),
      buildUseCaseContext(req as never)
    );
  }

  @Get("tables/:tableId/current")
  async getActiveOrder(@Param("tableId") tableId: string, @Req() req: Request) {
    return this.app.getActiveOrder(
      GetActiveRestaurantOrderInputSchema.parse({ tableId }),
      buildUseCaseContext(req as never)
    );
  }

  @Put("orders/:orderId/draft")
  async putDraftOrder(
    @Param("orderId") orderId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    return this.app.putDraftOrder(
      PutRestaurantDraftOrderInputSchema.parse({
        ...(body as object),
        orderId,
        idempotencyKey:
          (body as Record<string, unknown>)?.idempotencyKey ?? resolveIdempotencyKey(req as never),
      }),
      buildUseCaseContext(req as never)
    );
  }

  @Post("orders/:orderId/transfer")
  async transferTable(
    @Param("orderId") orderId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    return this.app.transferTable(
      TransferRestaurantTableInputSchema.parse({
        ...(body as object),
        orderId,
        idempotencyKey:
          (body as Record<string, unknown>)?.idempotencyKey ?? resolveIdempotencyKey(req as never),
      }),
      buildUseCaseContext(req as never)
    );
  }

  @Post("orders/:orderId/merge")
  async mergeChecks(@Param("orderId") orderId: string, @Body() body: unknown, @Req() req: Request) {
    return this.app.mergeChecks(
      MergeRestaurantChecksInputSchema.parse({
        ...(body as object),
        targetOrderId: orderId,
        idempotencyKey:
          (body as Record<string, unknown>)?.idempotencyKey ?? resolveIdempotencyKey(req as never),
      }),
      buildUseCaseContext(req as never)
    );
  }

  @Post("orders/:orderId/send")
  async sendOrderToKitchen(
    @Param("orderId") orderId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    return this.app.sendOrderToKitchen(
      SendRestaurantOrderToKitchenInputSchema.parse({
        ...(body as object),
        orderId,
        idempotencyKey:
          (body as Record<string, unknown>)?.idempotencyKey ?? resolveIdempotencyKey(req as never),
      }),
      buildUseCaseContext(req as never)
    );
  }

  @Get("kitchen/tickets")
  async listKitchenTickets(@Query() query: unknown, @Req() req: Request) {
    return this.app.listKitchenTickets(
      ListKitchenTicketsInputSchema.parse(query),
      buildUseCaseContext(req as never)
    );
  }

  @Post("kitchen/tickets/:ticketId/status")
  async updateKitchenTicketStatus(
    @Param("ticketId") ticketId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    return this.app.updateKitchenTicketStatus(
      UpdateKitchenTicketStatusInputSchema.parse({
        ...(body as object),
        ticketId,
        idempotencyKey:
          (body as Record<string, unknown>)?.idempotencyKey ?? resolveIdempotencyKey(req as never),
      }),
      buildUseCaseContext(req as never)
    );
  }

  @Post("approvals/void")
  async requestVoid(@Body() body: unknown, @Req() req: Request) {
    return this.app.requestVoid(
      RequestRestaurantVoidInputSchema.parse({
        ...(body as object),
        idempotencyKey:
          (body as Record<string, unknown>)?.idempotencyKey ?? resolveIdempotencyKey(req as never),
      }),
      buildUseCaseContext(req as never)
    );
  }

  @Post("approvals/discount")
  async requestDiscount(@Body() body: unknown, @Req() req: Request) {
    return this.app.requestDiscount(
      RequestRestaurantDiscountInputSchema.parse({
        ...(body as object),
        idempotencyKey:
          (body as Record<string, unknown>)?.idempotencyKey ?? resolveIdempotencyKey(req as never),
      }),
      buildUseCaseContext(req as never)
    );
  }

  @Post("approvals/:approvalRequestId/approve")
  async approveApproval(
    @Param("approvalRequestId") approvalRequestId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    return this.app.approveApproval(
      DecideRestaurantApprovalInputSchema.parse({
        ...(body as object),
        approvalRequestId,
        idempotencyKey:
          (body as Record<string, unknown>)?.idempotencyKey ?? resolveIdempotencyKey(req as never),
      }),
      buildUseCaseContext(req as never)
    );
  }

  @Post("approvals/:approvalRequestId/reject")
  async rejectApproval(
    @Param("approvalRequestId") approvalRequestId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    return this.app.rejectApproval(
      DecideRestaurantApprovalInputSchema.parse({
        ...(body as object),
        approvalRequestId,
        idempotencyKey:
          (body as Record<string, unknown>)?.idempotencyKey ?? resolveIdempotencyKey(req as never),
      }),
      buildUseCaseContext(req as never)
    );
  }

  @Post("orders/:orderId/close")
  async closeTable(@Param("orderId") orderId: string, @Body() body: unknown, @Req() req: Request) {
    return this.app.closeTable(
      CloseRestaurantTableInputSchema.parse({
        ...(body as object),
        orderId,
        idempotencyKey:
          (body as Record<string, unknown>)?.idempotencyKey ?? resolveIdempotencyKey(req as never),
      }),
      buildUseCaseContext(req as never)
    );
  }
}
