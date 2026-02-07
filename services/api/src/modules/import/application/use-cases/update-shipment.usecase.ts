import {
  BaseUseCase,
  type ClockPort,
  type IdGeneratorPort,
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
import type { UpdateShipmentInput, UpdateShipmentOutput } from "@corely/contracts";
import type { ImportShipmentRepositoryPort } from "../ports/import-shipment-repository.port";
import { toImportShipmentDto } from "../mappers/import-shipment-dto.mapper";
import { createImportShipmentLine } from "../../domain/import-shipment.entity";

type Deps = {
  logger: LoggerPort;
  repo: ImportShipmentRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  audit: AuditPort;
};

@RequireTenant()
export class UpdateShipmentUseCase extends BaseUseCase<UpdateShipmentInput, UpdateShipmentOutput> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: UpdateShipmentInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateShipmentOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }
    const userId = ctx.userId;

    const existing = await this.deps.repo.findById(tenantId, input.shipmentId);
    if (!existing) {
      return err(new NotFoundError("Import shipment not found", { shipmentId: input.shipmentId }));
    }

    // Don't allow updates to RECEIVED or CANCELED shipments
    if (existing.status === "RECEIVED" || existing.status === "CANCELED") {
      return err(
        new ValidationError(`Cannot update shipment in ${existing.status} status`, {
          status: existing.status,
        })
      );
    }

    const now = this.deps.clock.now();

    // Update lines if provided
    let lines = existing.lines;
    if (input.lines) {
      lines = input.lines.map((lineInput) =>
        createImportShipmentLine({
          id: this.deps.idGenerator.newId(),
          shipmentId: existing.id,
          productId: lineInput.productId,
          hsCode: lineInput.hsCode ?? null,
          orderedQty: lineInput.orderedQty,
          unitFobCostCents: lineInput.unitFobCostCents ?? null,
          weightKg: lineInput.weightKg ?? null,
          volumeM3: lineInput.volumeM3 ?? null,
          notes: lineInput.notes ?? null,
        })
      );
    }

    // Recalculate costs if lines or cost fields updated
    const fobValueCents =
      input.fobValueCents ??
      (input.lines
        ? lines.reduce((sum, line) => {
            if (line.unitFobCostCents) {
              return sum + line.orderedQty * line.unitFobCostCents;
            }
            return sum;
          }, 0)
        : existing.fobValueCents);

    const totalLandedCostCents =
      (fobValueCents ?? 0) +
      (input.freightCostCents ?? existing.freightCostCents ?? 0) +
      (input.insuranceCostCents ?? existing.insuranceCostCents ?? 0) +
      (input.customsDutyCents ?? existing.customsDutyCents ?? 0) +
      (input.customsTaxCents ?? existing.customsTaxCents ?? 0) +
      (input.otherCostsCents ?? existing.otherCostsCents ?? 0);

    const updated = {
      ...existing,
      supplierPartyId: input.supplierPartyId ?? existing.supplierPartyId,
      shippingMode: input.shippingMode ?? existing.shippingMode,
      containerNumber: input.containerNumber ?? existing.containerNumber,
      sealNumber: input.sealNumber ?? existing.sealNumber,
      billOfLadingNumber: input.billOfLadingNumber ?? existing.billOfLadingNumber,
      carrierName: input.carrierName ?? existing.carrierName,
      vesselName: input.vesselName ?? existing.vesselName,
      voyageNumber: input.voyageNumber ?? existing.voyageNumber,
      originCountry: input.originCountry ?? existing.originCountry,
      originPort: input.originPort ?? existing.originPort,
      destinationCountry: input.destinationCountry ?? existing.destinationCountry,
      destinationPort: input.destinationPort ?? existing.destinationPort,
      finalWarehouseId: input.finalWarehouseId ?? existing.finalWarehouseId,
      departureDate: input.departureDate ?? existing.departureDate,
      estimatedArrivalDate: input.estimatedArrivalDate ?? existing.estimatedArrivalDate,
      actualArrivalDate: input.actualArrivalDate ?? existing.actualArrivalDate,
      clearanceDate: input.clearanceDate ?? existing.clearanceDate,
      customsDeclarationNumber: input.customsDeclarationNumber ?? existing.customsDeclarationNumber,
      importLicenseNumber: input.importLicenseNumber ?? existing.importLicenseNumber,
      hsCodesPrimary: input.hsCodesPrimary ?? existing.hsCodesPrimary,
      incoterm: input.incoterm ?? existing.incoterm,
      fobValueCents: fobValueCents || null,
      freightCostCents: input.freightCostCents ?? existing.freightCostCents,
      insuranceCostCents: input.insuranceCostCents ?? existing.insuranceCostCents,
      customsDutyCents: input.customsDutyCents ?? existing.customsDutyCents,
      customsTaxCents: input.customsTaxCents ?? existing.customsTaxCents,
      otherCostsCents: input.otherCostsCents ?? existing.otherCostsCents,
      totalLandedCostCents: totalLandedCostCents || null,
      totalWeightKg: input.totalWeightKg ?? existing.totalWeightKg,
      totalVolumeM3: input.totalVolumeM3 ?? existing.totalVolumeM3,
      totalPackages: input.totalPackages ?? existing.totalPackages,
      notes: input.notes ?? existing.notes,
      metadataJson: input.metadataJson ?? existing.metadataJson,
      lines,
      updatedByUserId: userId,
      updatedAt: now,
    };

    await this.deps.repo.update(tenantId, updated);

    await this.deps.audit.log({
      tenantId,
      userId,
      action: "import.shipment.updated",
      entityType: "ImportShipment",
      entityId: updated.id,
    });

    return ok({ shipment: toImportShipmentDto(updated) });
  }
}
