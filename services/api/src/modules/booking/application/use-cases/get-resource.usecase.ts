import type { UseCaseContext } from "@corely/kernel";
import type { ResourceRepositoryPort } from "../ports/booking-repo.ports";
import type { BookingResource } from "../../domain/booking.entities";
import { NotFoundException } from "@nestjs/common";

export class GetResourceUseCase {
  constructor(private readonly resourceRepo: ResourceRepositoryPort) {}

  async execute(resourceId: string, ctx: UseCaseContext): Promise<BookingResource> {
    const resource = await this.resourceRepo.findById(resourceId, ctx.tenantId!);
    if (!resource) {
      throw new NotFoundException(`Resource ${resourceId} not found`);
    }
    return resource;
  }
}
