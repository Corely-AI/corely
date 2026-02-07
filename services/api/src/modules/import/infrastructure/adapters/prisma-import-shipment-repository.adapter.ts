import { Injectable } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import { formatLocalDate, parseLocalDate } from "@corely/kernel";
import type {
  ImportShipmentProps,
  ImportShipmentLineProps,
  ImportShipmentDocumentProps,
} from "../../domain/import-shipment.entity";
import type {
  ImportShipmentRepositoryPort,
  ListShipmentsFilters,
} from "../../application/ports/import-shipment-repository.port";

@Injectable()
export class PrismaImportShipmentRepositoryAdapter implements ImportShipmentRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tenantId: string, shipment: ImportShipmentProps): Promise<ImportShipmentProps> {
    const created = await this.prisma.importShipment.create({
      data: {
        id: shipment.id,
        tenantId,
        shipmentNumber: shipment.shipmentNumber,
        supplierPartyId: shipment.supplierPartyId,
        status: shipment.status,
        shippingMode: shipment.shippingMode,
        containerNumber: shipment.containerNumber,
        sealNumber: shipment.sealNumber,
        billOfLadingNumber: shipment.billOfLadingNumber,
        carrierName: shipment.carrierName,
        vesselName: shipment.vesselName,
        voyageNumber: shipment.voyageNumber,
        originCountry: shipment.originCountry,
        originPort: shipment.originPort,
        destinationCountry: shipment.destinationCountry,
        destinationPort: shipment.destinationPort,
        finalWarehouseId: shipment.finalWarehouseId,
        departureDate: shipment.departureDate ? new Date(shipment.departureDate) : null,
        estimatedArrivalDate: shipment.estimatedArrivalDate
          ? new Date(shipment.estimatedArrivalDate)
          : null,
        actualArrivalDate: shipment.actualArrivalDate ? new Date(shipment.actualArrivalDate) : null,
        clearanceDate: shipment.clearanceDate ? new Date(shipment.clearanceDate) : null,
        receivedDate: shipment.receivedDate ? new Date(shipment.receivedDate) : null,
        customsDeclarationNumber: shipment.customsDeclarationNumber,
        importLicenseNumber: shipment.importLicenseNumber,
        hsCodesPrimary: shipment.hsCodesPrimary,
        incoterm: shipment.incoterm,
        fobValueCents: shipment.fobValueCents,
        freightCostCents: shipment.freightCostCents,
        insuranceCostCents: shipment.insuranceCostCents,
        customsDutyCents: shipment.customsDutyCents,
        customsTaxCents: shipment.customsTaxCents,
        otherCostsCents: shipment.otherCostsCents,
        totalLandedCostCents: shipment.totalLandedCostCents,
        totalWeightKg: shipment.totalWeightKg,
        totalVolumeM3: shipment.totalVolumeM3,
        totalPackages: shipment.totalPackages,
        notes: shipment.notes,
        metadataJson: shipment.metadataJson as any,
        createdByUserId: shipment.createdByUserId,
        updatedByUserId: shipment.updatedByUserId,
        createdAt: shipment.createdAt,
        updatedAt: shipment.updatedAt,
        archivedAt: shipment.archivedAt,
        lines: {
          create: shipment.lines.map((line) => ({
            id: line.id,
            productId: line.productId,
            hsCode: line.hsCode,
            orderedQty: line.orderedQty,
            receivedQty: line.receivedQty,
            unitFobCostCents: line.unitFobCostCents,
            lineFobCostCents: line.lineFobCostCents,
            allocatedFreightCents: line.allocatedFreightCents,
            allocatedInsuranceCents: line.allocatedInsuranceCents,
            allocatedDutyCents: line.allocatedDutyCents,
            allocatedTaxCents: line.allocatedTaxCents,
            allocatedOtherCents: line.allocatedOtherCents,
            unitLandedCostCents: line.unitLandedCostCents,
            weightKg: line.weightKg,
            volumeM3: line.volumeM3,
            notes: line.notes,
          })),
        },
      },
      include: {
        lines: true,
        documents: true,
      },
    });

    return this.toDomain(created);
  }

  async findById(tenantId: string, shipmentId: string): Promise<ImportShipmentProps | null> {
    const shipment = await this.prisma.importShipment.findFirst({
      where: {
        id: shipmentId,
        tenantId,
        archivedAt: null,
      },
      include: {
        lines: true,
        documents: true,
      },
    });

    return shipment ? this.toDomain(shipment) : null;
  }

  async findByShipmentNumber(
    tenantId: string,
    shipmentNumber: string
  ): Promise<ImportShipmentProps | null> {
    const shipment = await this.prisma.importShipment.findFirst({
      where: {
        tenantId,
        shipmentNumber,
        archivedAt: null,
      },
      include: {
        lines: true,
        documents: true,
      },
    });

    return shipment ? this.toDomain(shipment) : null;
  }

  async update(tenantId: string, shipment: ImportShipmentProps): Promise<ImportShipmentProps> {
    // Delete existing lines and recreate (simpler than diff logic)
    await this.prisma.importShipmentLine.deleteMany({
      where: { shipmentId: shipment.id },
    });

    const updated = await this.prisma.importShipment.update({
      where: { id: shipment.id },
      data: {
        supplierPartyId: shipment.supplierPartyId,
        status: shipment.status,
        shippingMode: shipment.shippingMode,
        containerNumber: shipment.containerNumber,
        sealNumber: shipment.sealNumber,
        billOfLadingNumber: shipment.billOfLadingNumber,
        carrierName: shipment.carrierName,
        vesselName: shipment.vesselName,
        voyageNumber: shipment.voyageNumber,
        originCountry: shipment.originCountry,
        originPort: shipment.originPort,
        destinationCountry: shipment.destinationCountry,
        destinationPort: shipment.destinationPort,
        finalWarehouseId: shipment.finalWarehouseId,
        departureDate: shipment.departureDate ? new Date(shipment.departureDate) : null,
        estimatedArrivalDate: shipment.estimatedArrivalDate
          ? new Date(shipment.estimatedArrivalDate)
          : null,
        actualArrivalDate: shipment.actualArrivalDate ? new Date(shipment.actualArrivalDate) : null,
        clearanceDate: shipment.clearanceDate ? new Date(shipment.clearanceDate) : null,
        receivedDate: shipment.receivedDate ? new Date(shipment.receivedDate) : null,
        customsDeclarationNumber: shipment.customsDeclarationNumber,
        importLicenseNumber: shipment.importLicenseNumber,
        hsCodesPrimary: shipment.hsCodesPrimary,
        incoterm: shipment.incoterm,
        fobValueCents: shipment.fobValueCents,
        freightCostCents: shipment.freightCostCents,
        insuranceCostCents: shipment.insuranceCostCents,
        customsDutyCents: shipment.customsDutyCents,
        customsTaxCents: shipment.customsTaxCents,
        otherCostsCents: shipment.otherCostsCents,
        totalLandedCostCents: shipment.totalLandedCostCents,
        totalWeightKg: shipment.totalWeightKg,
        totalVolumeM3: shipment.totalVolumeM3,
        totalPackages: shipment.totalPackages,
        notes: shipment.notes,
        metadataJson: shipment.metadataJson as any,
        updatedByUserId: shipment.updatedByUserId,
        updatedAt: shipment.updatedAt,
        lines: {
          create: shipment.lines.map((line) => ({
            id: line.id,
            productId: line.productId,
            hsCode: line.hsCode,
            orderedQty: line.orderedQty,
            receivedQty: line.receivedQty,
            unitFobCostCents: line.unitFobCostCents,
            lineFobCostCents: line.lineFobCostCents,
            allocatedFreightCents: line.allocatedFreightCents,
            allocatedInsuranceCents: line.allocatedInsuranceCents,
            allocatedDutyCents: line.allocatedDutyCents,
            allocatedTaxCents: line.allocatedTaxCents,
            allocatedOtherCents: line.allocatedOtherCents,
            unitLandedCostCents: line.unitLandedCostCents,
            weightKg: line.weightKg,
            volumeM3: line.volumeM3,
            notes: line.notes,
          })),
        },
      },
      include: {
        lines: true,
        documents: true,
      },
    });

    return this.toDomain(updated);
  }

  async list(
    tenantId: string,
    filters: ListShipmentsFilters
  ): Promise<{ shipments: ImportShipmentProps[]; total: number }> {
    const where: any = {
      tenantId,
      archivedAt: null,
    };

    if (filters.supplierPartyId) {
      where.supplierPartyId = filters.supplierPartyId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.shippingMode) {
      where.shippingMode = filters.shippingMode;
    }
    if (filters.containerNumber) {
      where.containerNumber = { contains: filters.containerNumber, mode: "insensitive" };
    }
    if (filters.billOfLadingNumber) {
      where.billOfLadingNumber = { contains: filters.billOfLadingNumber, mode: "insensitive" };
    }

    // Date range filters
    if (filters.estimatedArrivalAfter || filters.estimatedArrivalBefore) {
      where.estimatedArrivalDate = {};
      if (filters.estimatedArrivalAfter) {
        where.estimatedArrivalDate.gte = new Date(filters.estimatedArrivalAfter);
      }
      if (filters.estimatedArrivalBefore) {
        where.estimatedArrivalDate.lte = new Date(filters.estimatedArrivalBefore);
      }
    }

    if (filters.actualArrivalAfter || filters.actualArrivalBefore) {
      where.actualArrivalDate = {};
      if (filters.actualArrivalAfter) {
        where.actualArrivalDate.gte = new Date(filters.actualArrivalAfter);
      }
      if (filters.actualArrivalBefore) {
        where.actualArrivalDate.lte = new Date(filters.actualArrivalBefore);
      }
    }

    const [shipments, total] = await Promise.all([
      this.prisma.importShipment.findMany({
        where,
        include: {
          lines: true,
          documents: true,
        },
        orderBy: { createdAt: "desc" },
        take: filters.limit ?? 50,
        skip: filters.offset ?? 0,
      }),
      this.prisma.importShipment.count({ where }),
    ]);

    return {
      shipments: shipments.map((s) => this.toDomain(s)),
      total,
    };
  }

  async getNextShipmentNumber(tenantId: string): Promise<string> {
    // Get or create settings
    let settings = await this.prisma.importSettings.findUnique({
      where: { tenantId },
    });

    if (!settings) {
      settings = await this.prisma.importSettings.create({
        data: {
          tenantId,
          shipmentPrefix: "IMP-",
          shipmentNextNumber: 1,
        },
      });
    }

    const shipmentNumber = `${settings.shipmentPrefix}${String(settings.shipmentNextNumber).padStart(5, "0")}`;

    // Increment for next time
    await this.prisma.importSettings.update({
      where: { tenantId },
      data: { shipmentNextNumber: { increment: 1 } },
    });

    return shipmentNumber;
  }

  private toDomain(raw: any): ImportShipmentProps {
    return {
      id: raw.id,
      tenantId: raw.tenantId,
      shipmentNumber: raw.shipmentNumber,
      supplierPartyId: raw.supplierPartyId,
      status: raw.status,
      shippingMode: raw.shippingMode,
      containerNumber: raw.containerNumber,
      sealNumber: raw.sealNumber,
      billOfLadingNumber: raw.billOfLadingNumber,
      carrierName: raw.carrierName,
      vesselName: raw.vesselName,
      voyageNumber: raw.voyageNumber,
      originCountry: raw.originCountry,
      originPort: raw.originPort,
      destinationCountry: raw.destinationCountry,
      destinationPort: raw.destinationPort,
      finalWarehouseId: raw.finalWarehouseId,
      departureDate: raw.departureDate ? formatLocalDate(raw.departureDate) : null,
      estimatedArrivalDate: raw.estimatedArrivalDate
        ? formatLocalDate(raw.estimatedArrivalDate)
        : null,
      actualArrivalDate: raw.actualArrivalDate ? formatLocalDate(raw.actualArrivalDate) : null,
      clearanceDate: raw.clearanceDate ? formatLocalDate(raw.clearanceDate) : null,
      receivedDate: raw.receivedDate ? formatLocalDate(raw.receivedDate) : null,
      customsDeclarationNumber: raw.customsDeclarationNumber,
      importLicenseNumber: raw.importLicenseNumber,
      hsCodesPrimary: raw.hsCodesPrimary || [],
      incoterm: raw.incoterm,
      fobValueCents: raw.fobValueCents,
      freightCostCents: raw.freightCostCents,
      insuranceCostCents: raw.insuranceCostCents,
      customsDutyCents: raw.customsDutyCents,
      customsTaxCents: raw.customsTaxCents,
      otherCostsCents: raw.otherCostsCents,
      totalLandedCostCents: raw.totalLandedCostCents,
      totalWeightKg: raw.totalWeightKg ? Number(raw.totalWeightKg) : null,
      totalVolumeM3: raw.totalVolumeM3 ? Number(raw.totalVolumeM3) : null,
      totalPackages: raw.totalPackages,
      notes: raw.notes,
      metadataJson: raw.metadataJson,
      lines: (raw.lines || []).map(this.lineToDomain),
      documents: (raw.documents || []).map(this.documentToDomain),
      createdByUserId: raw.createdByUserId,
      updatedByUserId: raw.updatedByUserId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      archivedAt: raw.archivedAt,
    };
  }

  private lineToDomain(raw: any): ImportShipmentLineProps {
    return {
      id: raw.id,
      shipmentId: raw.shipmentId,
      productId: raw.productId,
      hsCode: raw.hsCode,
      orderedQty: raw.orderedQty,
      receivedQty: raw.receivedQty,
      unitFobCostCents: raw.unitFobCostCents,
      lineFobCostCents: raw.lineFobCostCents,
      allocatedFreightCents: raw.allocatedFreightCents,
      allocatedInsuranceCents: raw.allocatedInsuranceCents,
      allocatedDutyCents: raw.allocatedDutyCents,
      allocatedTaxCents: raw.allocatedTaxCents,
      allocatedOtherCents: raw.allocatedOtherCents,
      unitLandedCostCents: raw.unitLandedCostCents,
      weightKg: raw.weightKg ? Number(raw.weightKg) : null,
      volumeM3: raw.volumeM3 ? Number(raw.volumeM3) : null,
      notes: raw.notes,
    };
  }

  private documentToDomain(raw: any): ImportShipmentDocumentProps {
    return {
      id: raw.id,
      shipmentId: raw.shipmentId,
      documentType: raw.documentType,
      documentNumber: raw.documentNumber,
      documentName: raw.documentName,
      documentUrl: raw.documentUrl,
      fileStorageKey: raw.fileStorageKey,
      mimeType: raw.mimeType,
      fileSizeBytes: raw.fileSizeBytes,
      uploadedByUserId: raw.uploadedByUserId,
      uploadedAt: raw.uploadedAt,
      notes: raw.notes,
    };
  }
}
