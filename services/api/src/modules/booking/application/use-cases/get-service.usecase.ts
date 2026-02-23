import type { UseCaseContext } from "@corely/kernel";
import type { ServiceRepositoryPort } from "../ports/booking-repo.ports";
import { NotFoundException } from "@nestjs/common";

export class GetServiceOfferingUseCase {
  constructor(private readonly serviceRepo: ServiceRepositoryPort) {}

  async execute(serviceId: string, ctx: UseCaseContext) {
    const service = await this.serviceRepo.findById(serviceId, ctx.tenantId!);
    if (!service) {
      throw new NotFoundException(`Service ${serviceId} not found`);
    }
    return service;
  }
}
