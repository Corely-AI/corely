import type { UseCaseContext } from "@corely/kernel";
import type { BookingRepositoryPort } from "../ports/booking-repo.ports";

export class ListBookingsUseCase {
  constructor(private readonly bookingRepo: BookingRepositoryPort) {}

  async execute(
    input: {
      q?: string;
      status?: string;
      resourceId?: string;
      serviceOfferingId?: string;
      fromDate?: string;
      toDate?: string;
      bookedByPartyId?: string;
      page?: number;
      pageSize?: number;
    },
    ctx: UseCaseContext
  ) {
    return this.bookingRepo.findMany(
      ctx.tenantId!,
      {
        q: input.q,
        status: input.status,
        resourceId: input.resourceId,
        serviceOfferingId: input.serviceOfferingId,
        fromDate: input.fromDate ? new Date(input.fromDate) : undefined,
        toDate: input.toDate ? new Date(input.toDate) : undefined,
        bookedByPartyId: input.bookedByPartyId,
      },
      input.page ?? 1,
      input.pageSize ?? 10
    );
  }
}
