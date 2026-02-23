import type { UseCaseContext } from "@corely/kernel";
import type { ServiceRepositoryPort } from "../ports/booking-repo.ports";
import type { AuditPort } from "../../../../shared/ports/audit.port";

export class DeleteServiceOfferingUseCase {
  constructor(
    private readonly serviceRepo: ServiceRepositoryPort,
    private readonly audit: AuditPort
  ) {}

  async execute(serviceId: string, ctx: UseCaseContext): Promise<void> {
    const tenantId = ctx.tenantId!;
    await this.serviceRepo.delete(serviceId, tenantId);

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "booking.service.deleted",
      entityType: "BookingServiceOffering",
      entityId: serviceId,
      metadata: {},
    });
  }
}
