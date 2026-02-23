import type { UseCaseContext } from "@corely/kernel";
import type { ResourceRepositoryPort } from "../ports/booking-repo.ports";
import type { BookingResource } from "../../domain/booking.entities";

export interface ListResourcesInput {
  q?: string;
  type?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export class ListResourcesUseCase {
  constructor(private readonly resourceRepo: ResourceRepositoryPort) {}

  async execute(
    input: ListResourcesInput,
    ctx: UseCaseContext
  ): Promise<{ items: BookingResource[]; total: number }> {
    return this.resourceRepo.findMany(
      ctx.tenantId!,
      {
        q: input.q,
        type: input.type,
        isActive: input.isActive,
      },
      input.page ?? 1,
      input.pageSize ?? 10
    );
  }
}
