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
import type { AllocateLandedCostsInput, AllocateLandedCostsOutput } from "@corely/contracts";
import type { ImportShipmentRepositoryPort } from "../ports/import-shipment-repository.port";
import { toImportShipmentDto } from "../mappers/import-shipment-dto.mapper";
import {
  allocateLandedCosts,
  validateShipmentForAllocation,
} from "../../domain/landed-cost-allocator";

type Deps = {
  logger: LoggerPort;
  repo: ImportShipmentRepositoryPort;
  clock: ClockPort;
  audit: AuditPort;
};

@RequireTenant()
export class AllocateLandedCostsUseCase extends BaseUseCase<
  AllocateLandedCostsInput,
  AllocateLandedCostsOutput
> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: AllocateLandedCostsInput,
    ctx: UseCaseContext
  ): Promise<Result<AllocateLandedCostsOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }
    const userId = ctx.userId;

    const shipment = await this.deps.repo.findById(tenantId, input.shipmentId);
    if (!shipment) {
      return err(new NotFoundError("Import shipment not found", { shipmentId: input.shipmentId }));
    }

    // Validate shipment is ready for allocation
    const validation = validateShipmentForAllocation(shipment);
    if (!validation.valid) {
      return err(
        new ValidationError("Shipment not ready for landed cost allocation", {
          errors: validation.errors,
        })
      );
    }

    // Perform allocation
    const allocationResult = allocateLandedCosts({
      shipment,
      allocationMethod: input.allocationMethod,
    });

    // Update shipment with allocated costs
    const now = this.deps.clock.now();
    const updated = {
      ...shipment,
      lines: allocationResult.allocatedLines,
      totalLandedCostCents: allocationResult.totalAllocatedCents,
      updatedByUserId: userId,
      updatedAt: now,
    };

    await this.deps.repo.update(tenantId, updated);

    await this.deps.audit.log({
      tenantId,
      userId,
      action: "import.shipment.landed_costs_allocated",
      entityType: "ImportShipment",
      entityId: updated.id,
      metadata: {
        allocationMethod: input.allocationMethod,
        totalAllocatedCents: allocationResult.totalAllocatedCents,
      },
    });

    return ok({ shipment: toImportShipmentDto(updated) });
  }
}
