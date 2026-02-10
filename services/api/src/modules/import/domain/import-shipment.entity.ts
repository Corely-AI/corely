/**
 * Import Shipment Domain Entity
 */

export type ImportShipmentStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_TRANSIT"
  | "CUSTOMS_CLEARANCE"
  | "CLEARED"
  | "RECEIVED"
  | "CANCELED";

export type ImportDocumentType =
  | "BILL_OF_LADING"
  | "COMMERCIAL_INVOICE"
  | "PACKING_LIST"
  | "CERTIFICATE_OF_ORIGIN"
  | "IMPORT_LICENSE"
  | "CUSTOMS_DECLARATION"
  | "INSPECTION_REPORT"
  | "OTHER";

export type ShippingMode = "SEA" | "AIR" | "LAND" | "COURIER";

export interface ImportShipmentLineProps {
  id: string;
  shipmentId: string;
  productId: string;
  hsCode: string | null;
  orderedQty: number;
  receivedQty: number;
  unitFobCostCents: number | null;
  lineFobCostCents: number | null;
  allocatedFreightCents: number | null;
  allocatedInsuranceCents: number | null;
  allocatedDutyCents: number | null;
  allocatedTaxCents: number | null;
  allocatedOtherCents: number | null;
  unitLandedCostCents: number | null;
  weightKg: number | null;
  volumeM3: number | null;
  notes: string | null;
}

export interface ImportShipmentDocumentProps {
  id: string;
  shipmentId: string;
  documentType: ImportDocumentType;
  documentNumber: string | null;
  documentName: string;
  documentUrl: string | null;
  fileStorageKey: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  uploadedByUserId: string | null;
  uploadedAt: Date;
  notes: string | null;
}

export interface ImportShipmentProps {
  id: string;
  tenantId: string;
  shipmentNumber: string | null;
  supplierPartyId: string;
  status: ImportShipmentStatus;
  shippingMode: ShippingMode;
  containerNumber: string | null;
  sealNumber: string | null;
  billOfLadingNumber: string | null;
  carrierName: string | null;
  vesselName: string | null;
  voyageNumber: string | null;
  originCountry: string | null;
  originPort: string | null;
  destinationCountry: string | null;
  destinationPort: string | null;
  finalWarehouseId: string | null;
  departureDate: string | null; // LocalDate
  estimatedArrivalDate: string | null; // LocalDate
  actualArrivalDate: string | null; // LocalDate
  clearanceDate: string | null; // LocalDate
  receivedDate: string | null; // LocalDate
  customsDeclarationNumber: string | null;
  importLicenseNumber: string | null;
  hsCodesPrimary: string[];
  incoterm: string | null;
  fobValueCents: number | null;
  freightCostCents: number | null;
  insuranceCostCents: number | null;
  customsDutyCents: number | null;
  customsTaxCents: number | null;
  otherCostsCents: number | null;
  totalLandedCostCents: number | null;
  totalWeightKg: number | null;
  totalVolumeM3: number | null;
  totalPackages: number | null;
  notes: string | null;
  metadataJson: Record<string, any> | null;
  lines: ImportShipmentLineProps[];
  documents?: ImportShipmentDocumentProps[];
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export function createImportShipment(
  props: Omit<
    ImportShipmentProps,
    "id" | "shipmentNumber" | "status" | "createdAt" | "updatedAt" | "archivedAt"
  > & {
    id?: string;
    shipmentNumber?: string | null;
    status?: ImportShipmentStatus;
  }
): ImportShipmentProps {
  const now = new Date();
  return {
    ...props,
    id: props.id ?? generateCuid(),
    shipmentNumber: props.shipmentNumber ?? null,
    status: props.status ?? "DRAFT",
    hsCodesPrimary: props.hsCodesPrimary ?? [],
    lines: props.lines ?? [],
    documents: props.documents ?? [],
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
}

export function createImportShipmentLine(
  props: Omit<
    ImportShipmentLineProps,
    | "id"
    | "receivedQty"
    | "lineFobCostCents"
    | "allocatedFreightCents"
    | "allocatedInsuranceCents"
    | "allocatedDutyCents"
    | "allocatedTaxCents"
    | "allocatedOtherCents"
    | "unitLandedCostCents"
  > & {
    id?: string;
    receivedQty?: number;
    lineFobCostCents?: number | null;
  }
): ImportShipmentLineProps {
  return {
    ...props,
    id: props.id ?? generateCuid(),
    receivedQty: props.receivedQty ?? 0,
    hsCode: props.hsCode ?? null,
    unitFobCostCents: props.unitFobCostCents ?? null,
    lineFobCostCents:
      props.lineFobCostCents ??
      (props.unitFobCostCents ? props.orderedQty * props.unitFobCostCents : null),
    allocatedFreightCents: null,
    allocatedInsuranceCents: null,
    allocatedDutyCents: null,
    allocatedTaxCents: null,
    allocatedOtherCents: null,
    unitLandedCostCents: null,
    weightKg: props.weightKg ?? null,
    volumeM3: props.volumeM3 ?? null,
    notes: props.notes ?? null,
  };
}

// Simple CUID generator (for consistency with existing code)
function generateCuid(): string {
  // In production, this would use the actual cuid library
  // For now, we'll assume the repository layer handles ID generation
  return `tmp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
