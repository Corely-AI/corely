import type { UseCaseContext } from "@corely/kernel";
import type { ServiceRepositoryPort } from "../ports/booking-repo.ports";

export class ListServiceOfferingsUseCase {
  constructor(private readonly serviceRepo: ServiceRepositoryPort) {}

  async execute(
    input: { q?: string; isActive?: boolean; page?: number; pageSize?: number },
    ctx: UseCaseContext
  ) {
    return this.serviceRepo.findMany(
      ctx.tenantId!,
      {
        q: input.q,
        isActive: input.isActive,
      },
      input.page ?? 1,
      input.pageSize ?? 10
    );
  }
}
