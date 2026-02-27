import type { UseCaseContext } from "@corely/kernel";
import type { ResourceRepositoryPort } from "../ports/booking-repo.ports";
import type { AuditPort } from "../../../../shared/ports/audit.port";

export class DeleteResourceUseCase {
  constructor(
    private readonly resourceRepo: ResourceRepositoryPort,
    private readonly audit: AuditPort
  ) {}

  async execute(resourceId: string, ctx: UseCaseContext): Promise<void> {
    const tenantId = ctx.tenantId!;
    await this.resourceRepo.delete(resourceId, tenantId);

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "booking.resource.deleted",
      entityType: "BookingResource",
      entityId: resourceId,
      metadata: {},
    });
  }
}
