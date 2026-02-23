import type { UseCaseContext } from "@corely/kernel";
import type { ServiceRepositoryPort } from "../ports/booking-repo.ports";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import { NotFoundException } from "@nestjs/common";
import type { ResourceType } from "../../domain/booking.entities";

export interface UpdateServiceOfferingInput {
  serviceId: string;
  name?: string;
  description?: string | null;
  durationMinutes?: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  priceCents?: number | null;
  currency?: string | null;
  depositCents?: number | null;
  requiredResourceTypes?: ResourceType[];
  requiredTags?: string[];
  isActive?: boolean;
}

export class UpdateServiceOfferingUseCase {
  constructor(
    private readonly serviceRepo: ServiceRepositoryPort,
    private readonly audit: AuditPort
  ) {}

  async execute(input: UpdateServiceOfferingInput, ctx: UseCaseContext) {
    const tenantId = ctx.tenantId!;
    const service = await this.serviceRepo.findById(input.serviceId, tenantId);
    if (!service) {
      throw new NotFoundException(`Service ${input.serviceId} not found`);
    }

    service.update({
      name: input.name,
      description: input.description,
      durationMinutes: input.durationMinutes,
      bufferBeforeMinutes: input.bufferBeforeMinutes,
      bufferAfterMinutes: input.bufferAfterMinutes,
      priceCents: input.priceCents,
      currency: input.currency,
      depositCents: input.depositCents,
      requiredResourceTypes: input.requiredResourceTypes,
      requiredTags: input.requiredTags,
      isActive: input.isActive,
    });

    const updated = await this.serviceRepo.update(service);

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "booking.service.updated",
      entityType: "BookingServiceOffering",
      entityId: service.id,
      metadata: {},
    });

    return updated;
  }
}
