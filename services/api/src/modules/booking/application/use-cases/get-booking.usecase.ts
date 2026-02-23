import type { UseCaseContext } from "@corely/kernel";
import type { BookingRepositoryPort } from "../ports/booking-repo.ports";
import { NotFoundException } from "@nestjs/common";

export class GetBookingUseCase {
  constructor(private readonly bookingRepo: BookingRepositoryPort) {}

  async execute(bookingId: string, ctx: UseCaseContext) {
    const booking = await this.bookingRepo.findById(bookingId, ctx.tenantId!);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }
    return booking;
  }
}
