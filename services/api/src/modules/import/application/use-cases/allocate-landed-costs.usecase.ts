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
import type { PrismaService } from "@corely/data";
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
  prisma: PrismaService;
};

@RequireTenant()
export class AllocateLandedCostsUseCase extends BaseUseCase<
  AllocateLandedCostsInput,
  AllocateLandedCostsOutput
> {
  constructor(private readonly shipmentDeps: Deps) {
    super({ logger: shipmentDeps.logger });
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

    const shipment = await this.shipmentDeps.repo.findById(tenantId, input.shipmentId);
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
    const now = this.shipmentDeps.clock.now();
    const updated = {
      ...shipment,
      lines: allocationResult.allocatedLines,
      totalLandedCostCents: allocationResult.totalAllocatedCents,
      updatedByUserId: userId,
      updatedAt: now,
    };

    await this.shipmentDeps.repo.update(tenantId, updated);

    // Keep lot valuation in sync with shipment allocation for linked lots.
    const linkedLots = await this.shipmentDeps.prisma.inventoryLot.findMany({
      where: {
        tenantId,
        shipmentId: shipment.id,
        archivedAt: null,
      },
      select: {
        id: true,
        productId: true,
      },
    });

    if (linkedLots.length > 0) {
      const lineCostByProductId = new Map<string, number>();
      for (const line of allocationResult.allocatedLines) {
        if (line.unitLandedCostCents !== null && line.unitLandedCostCents !== undefined) {
          lineCostByProductId.set(line.productId, line.unitLandedCostCents);
        }
      }

      const fallbackUnitCost =
        allocationResult.allocatedLines.length === 1
          ? (allocationResult.allocatedLines[0].unitLandedCostCents ?? null)
          : null;

      for (const lot of linkedLots) {
        const nextUnitCost =
          lineCostByProductId.get(lot.productId) ?? fallbackUnitCost ?? undefined;
        if (nextUnitCost === undefined) {
          continue;
        }

        await this.shipmentDeps.prisma.inventoryLot.update({
          where: { id: lot.id },
          data: {
            unitCostCents: nextUnitCost,
            updatedAt: now,
          },
        });
      }
    }

    await this.shipmentDeps.audit.log({
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
