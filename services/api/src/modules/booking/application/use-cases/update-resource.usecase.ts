import type { UseCaseContext } from "@corely/kernel";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import { NotFoundException } from "@nestjs/common";
import type { ResourceRepositoryPort } from "../ports/booking-repo.ports";

export interface UpdateResourceInput {
  resourceId: string;
  type?: "STAFF" | "ROOM" | "EQUIPMENT";
  name?: string;
  description?: string | null;
  location?: string | null;
  capacity?: number | null;
  tags?: string[];
  attributes?: Record<string, unknown> | null;
  isActive?: boolean;
}

export class UpdateResourceUseCase {
  constructor(
    private readonly resourceRepo: ResourceRepositoryPort,
    private readonly audit: AuditPort,
    private readonly clock: ClockPort
  ) {}

  async execute(input: UpdateResourceInput, ctx: UseCaseContext) {
    const tenantId = ctx.tenantId!;
    const resource = await this.resourceRepo.findById(input.resourceId, tenantId);
    if (!resource) {
      throw new NotFoundException(`Resource ${input.resourceId} not found`);
    }

    resource.update({
      type: input.type,
      name: input.name,
      description: input.description,
      location: input.location,
      capacity: input.capacity,
      tags: input.tags,
      attributes: input.attributes,
      isActive: input.isActive,
    });

    const updated = await this.resourceRepo.update(resource);

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "booking.resource.updated",
      entityType: "BookingResource",
      entityId: resource.id,
      metadata: {},
    });

    return updated;
  }
}
