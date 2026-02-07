import type {
  ImportShipmentDto,
  ImportShipmentLineDto,
  ImportShipmentDocumentDto,
} from "@corely/contracts";
import type {
  ImportShipmentProps,
  ImportShipmentLineProps,
  ImportShipmentDocumentProps,
} from "../../domain/import-shipment.entity";

export function toImportShipmentDto(shipment: ImportShipmentProps): ImportShipmentDto {
  return {
    id: shipment.id,
    tenantId: shipment.tenantId,
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
    departureDate: shipment.departureDate,
    estimatedArrivalDate: shipment.estimatedArrivalDate,
    actualArrivalDate: shipment.actualArrivalDate,
    clearanceDate: shipment.clearanceDate,
    receivedDate: shipment.receivedDate,
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
    metadataJson: shipment.metadataJson,
    lines: shipment.lines.map(toImportShipmentLineDto),
    documents: shipment.documents?.map(toImportShipmentDocumentDto),
    createdAt: shipment.createdAt.toISOString(),
    updatedAt: shipment.updatedAt.toISOString(),
  };
}

export function toImportShipmentLineDto(line: ImportShipmentLineProps): ImportShipmentLineDto {
  return {
    id: line.id,
    shipmentId: line.shipmentId,
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
  };
}

export function toImportShipmentDocumentDto(
  doc: ImportShipmentDocumentProps
): ImportShipmentDocumentDto {
  return {
    id: doc.id,
    shipmentId: doc.shipmentId,
    documentType: doc.documentType,
    documentNumber: doc.documentNumber,
    documentName: doc.documentName,
    documentUrl: doc.documentUrl,
    fileStorageKey: doc.fileStorageKey,
    mimeType: doc.mimeType,
    fileSizeBytes: doc.fileSizeBytes,
    uploadedByUserId: doc.uploadedByUserId,
    uploadedAt: doc.uploadedAt.toISOString(),
    notes: doc.notes,
  };
}
