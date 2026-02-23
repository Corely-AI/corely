import { Controller, Get, Post, Patch, Body, Param, Req, Query, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthGuard } from "../../identity/adapters/http/auth.guard";
import { RequireTenant } from "@corely/kernel";
import { buildUseCaseContext, resolveIdempotencyKey } from "../../../shared/http/usecase-mappers";
import { parseListQuery, buildPageInfo } from "../../../shared/http/pagination";

import { CreateBookingUseCase } from "../application/use-cases/create-booking.usecase";
import { CreateHoldUseCase } from "../application/use-cases/create-hold.usecase";
import { ListBookingsUseCase } from "../application/use-cases/list-bookings.usecase";
import { GetBookingUseCase } from "../application/use-cases/get-booking.usecase";
import { RescheduleBookingUseCase } from "../application/use-cases/reschedule-booking.usecase";
import { CancelBookingUseCase } from "../application/use-cases/cancel-booking.usecase";

import {
  CreateBookingInputSchema,
  CreateHoldInputSchema,
  ListBookingsInputSchema,
  RescheduleBookingInputSchema,
  CancelBookingInputSchema,
} from "@corely/contracts";

@Controller("booking/bookings")
@UseGuards(AuthGuard)
@RequireTenant()
export class BookingController {
  constructor(
    private readonly createBooking: CreateBookingUseCase,
    private readonly createHold: CreateHoldUseCase,
    private readonly listBookings: ListBookingsUseCase,
    private readonly getBooking: GetBookingUseCase,
    private readonly rescheduleBooking: RescheduleBookingUseCase,
    private readonly cancelBooking: CancelBookingUseCase
  ) {}

  @Post("holds")
  async hold(@Req() req: Request, @Body() body: any) {
    const parsedBody = CreateHoldInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const idempotencyKey = resolveIdempotencyKey(req);
    // parse ISO strings to dates for domain
    const hold = await this.createHold.execute(
      {
        ...parsedBody,
        startAt: new Date(parsedBody.startAt),
        endAt: new Date(parsedBody.endAt),
        idempotencyKey,
      } as any,
      ctx
    );
    return { hold };
  }

  @Post()
  async create(@Req() req: Request, @Body() body: any) {
    const parsedBody = CreateBookingInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const idempotencyKey = resolveIdempotencyKey(req);
    const booking = await this.createBooking.execute(
      {
        ...parsedBody,
        startAt: parsedBody.startAt ? new Date(parsedBody.startAt) : undefined,
        endAt: parsedBody.endAt ? new Date(parsedBody.endAt) : undefined,
        idempotencyKey,
      } as any,
      ctx
    );
    return { booking };
  }

  @Get()
  async list(@Req() req: Request, @Query() query: any) {
    const parsedQuery = ListBookingsInputSchema.parse(query);
    const ctx = buildUseCaseContext(req);
    const { page, pageSize } = parseListQuery(query);
    const result = await this.listBookings.execute({ ...parsedQuery, page, pageSize }, ctx);
    return { items: result.items, pageInfo: buildPageInfo(result.total, page, pageSize) };
  }

  @Get(":id")
  async get(@Req() req: Request, @Param("id") id: string) {
    const ctx = buildUseCaseContext(req);
    const booking = await this.getBooking.execute(id, ctx);
    return { booking };
  }

  @Patch(":id/reschedule")
  async reschedule(@Req() req: Request, @Param("id") id: string, @Body() body: any) {
    const parsedBody = RescheduleBookingInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const idempotencyKey = resolveIdempotencyKey(req);
    const booking = await this.rescheduleBooking.execute(
      {
        bookingId: id,
        startAt: new Date(parsedBody.startAt),
        endAt: new Date(parsedBody.endAt),
        notes: parsedBody.notes,
        idempotencyKey,
      },
      ctx
    );
    return { booking };
  }

  @Post(":id/cancel")
  async cancel(@Req() req: Request, @Param("id") id: string, @Body() body: any) {
    const parsedBody = CancelBookingInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const idempotencyKey = resolveIdempotencyKey(req);
    const booking = await this.cancelBooking.execute(
      {
        bookingId: id,
        reason: parsedBody.reason,
        idempotencyKey,
      },
      ctx
    );
    return { booking };
  }
}
