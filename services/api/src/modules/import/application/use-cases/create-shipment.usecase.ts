import {
  BaseUseCase,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  type AuditPort,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { CreateShipmentInput, CreateShipmentOutput } from "@corely/contracts";
import type { ImportShipmentRepositoryPort } from "../ports/import-shipment-repository.port";
import { toImportShipmentDto } from "../mappers/import-shipment-dto.mapper";
import {
  createImportShipment,
  createImportShipmentLine,
} from "../../domain/import-shipment.entity";

type Deps = {
  logger: LoggerPort;
  repo: ImportShipmentRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  audit: AuditPort;
};

@RequireTenant()
export class CreateShipmentUseCase extends BaseUseCase<CreateShipmentInput, CreateShipmentOutput> {
  constructor(private readonly shipmentDeps: Deps) {
    super({ logger: shipmentDeps.logger });
  }

  protected async handle(
    input: CreateShipmentInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateShipmentOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }
    const userId = ctx.userId;

    // Validate lines
    if (!input.lines || input.lines.length === 0) {
      return err(new ValidationError("At least one line is required"));
    }

    const now = this.shipmentDeps.clock.now();
    const shipmentId = this.shipmentDeps.idGenerator.newId();

    // Generate shipment number
    const shipmentNumber = await this.shipmentDeps.repo.getNextShipmentNumber(tenantId);

    // Calculate total FOB value from lines
    const fobValueCents =
      input.fobValueCents ??
      input.lines.reduce((sum, line) => {
        if (line.unitFobCostCents) {
          return sum + line.orderedQty * line.unitFobCostCents;
        }
        return sum;
      }, 0);

    // Calculate total landed cost
    const totalLandedCostCents =
      (fobValueCents ?? 0) +
      (input.freightCostCents ?? 0) +
      (input.insuranceCostCents ?? 0) +
      (input.customsDutyCents ?? 0) +
      (input.customsTaxCents ?? 0) +
      (input.otherCostsCents ?? 0);

    // Create lines
    const lines = input.lines.map((lineInput) =>
      createImportShipmentLine({
        id: this.shipmentDeps.idGenerator.newId(),
        shipmentId,
        productId: lineInput.productId,
        hsCode: lineInput.hsCode ?? null,
        orderedQty: lineInput.orderedQty,
        unitFobCostCents: lineInput.unitFobCostCents ?? null,
        weightKg: lineInput.weightKg ?? null,
        volumeM3: lineInput.volumeM3 ?? null,
        notes: lineInput.notes ?? null,
      })
    );

    const shipment = createImportShipment({
      id: shipmentId,
      tenantId,
      shipmentNumber,
      supplierPartyId: input.supplierPartyId,
      shippingMode: input.shippingMode ?? "SEA",
      containerNumber: input.containerNumber ?? null,
      sealNumber: input.sealNumber ?? null,
      billOfLadingNumber: input.billOfLadingNumber ?? null,
      carrierName: input.carrierName ?? null,
      vesselName: input.vesselName ?? null,
      voyageNumber: input.voyageNumber ?? null,
      originCountry: input.originCountry ?? null,
      originPort: input.originPort ?? null,
      destinationCountry: input.destinationCountry ?? null,
      destinationPort: input.destinationPort ?? null,
      finalWarehouseId: input.finalWarehouseId ?? null,
      departureDate: input.departureDate ?? null,
      estimatedArrivalDate: input.estimatedArrivalDate ?? null,
      actualArrivalDate: null,
      clearanceDate: null,
      receivedDate: null,
      customsDeclarationNumber: input.customsDeclarationNumber ?? null,
      importLicenseNumber: input.importLicenseNumber ?? null,
      hsCodesPrimary: input.hsCodesPrimary ?? [],
      incoterm: input.incoterm ?? null,
      fobValueCents: fobValueCents || null,
      freightCostCents: input.freightCostCents ?? null,
      insuranceCostCents: input.insuranceCostCents ?? null,
      customsDutyCents: input.customsDutyCents ?? null,
      customsTaxCents: input.customsTaxCents ?? null,
      otherCostsCents: input.otherCostsCents ?? null,
      totalLandedCostCents: totalLandedCostCents || null,
      totalWeightKg: input.totalWeightKg ?? null,
      totalVolumeM3: input.totalVolumeM3 ?? null,
      totalPackages: input.totalPackages ?? null,
      notes: input.notes ?? null,
      metadataJson: input.metadataJson ?? null,
      lines,
      documents: [],
      createdByUserId: userId,
      updatedByUserId: userId,
    });

    await this.shipmentDeps.repo.create(tenantId, shipment);

    await this.shipmentDeps.audit.log({
      tenantId,
      userId,
      action: "import.shipment.created",
      entityType: "ImportShipment",
      entityId: shipment.id,
    });

    return ok({ shipment: toImportShipmentDto(shipment) });
  }
}
