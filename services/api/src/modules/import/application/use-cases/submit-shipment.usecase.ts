import {
  BaseUseCase,
  type ClockPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  type AuditPort,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { SubmitShipmentInput, SubmitShipmentOutput } from "@corely/contracts";
import type { ImportShipmentRepositoryPort } from "../ports/import-shipment-repository.port";
import { toImportShipmentDto } from "../mappers/import-shipment-dto.mapper";

type Deps = {
  logger: LoggerPort;
  repo: ImportShipmentRepositoryPort;
  clock: ClockPort;
  audit: AuditPort;
};

@RequireTenant()
export class SubmitShipmentUseCase extends BaseUseCase<SubmitShipmentInput, SubmitShipmentOutput> {
  constructor(private readonly shipmentDeps: Deps) {
    super({ logger: shipmentDeps.logger });
  }

  protected async handle(
    input: SubmitShipmentInput,
    ctx: UseCaseContext
  ): Promise<Result<SubmitShipmentOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }
    const userId = ctx.userId;

    const shipment = await this.shipmentDeps.repo.findById(tenantId, input.shipmentId);
    if (!shipment) {
      return err(new NotFoundError("Import shipment not found", { shipmentId: input.shipmentId }));
    }

    // Only allow submission from DRAFT status
    if (shipment.status !== "DRAFT") {
      return err(
        new ValidationError("Only DRAFT shipments can be submitted", {
          currentStatus: shipment.status,
        })
      );
    }

    // Validate required fields
    if (!shipment.lines || shipment.lines.length === 0) {
      return err(new ValidationError("Shipment must have at least one line"));
    }

    const now = this.shipmentDeps.clock.now();
    const updated = {
      ...shipment,
      status: "SUBMITTED" as const,
      updatedByUserId: userId,
      updatedAt: now,
    };

    await this.shipmentDeps.repo.update(tenantId, updated);

    await this.shipmentDeps.audit.log({
      tenantId,
      userId,
      action: "import.shipment.submitted",
      entityType: "ImportShipment",
      entityId: updated.id,
    });

    return ok({ shipment: toImportShipmentDto(updated) });
  }
}
