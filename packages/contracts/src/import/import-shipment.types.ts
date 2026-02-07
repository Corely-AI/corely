import { z } from "zod";
import { localDateSchema, utcInstantSchema } from "../shared/local-date.schema";

export const ImportShipmentStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "IN_TRANSIT",
  "CUSTOMS_CLEARANCE",
  "CLEARED",
  "RECEIVED",
  "CANCELED",
]);
export type ImportShipmentStatus = z.infer<typeof ImportShipmentStatusSchema>;

export const ImportDocumentTypeSchema = z.enum([
  "BILL_OF_LADING",
  "COMMERCIAL_INVOICE",
  "PACKING_LIST",
  "CERTIFICATE_OF_ORIGIN",
  "IMPORT_LICENSE",
  "CUSTOMS_DECLARATION",
  "INSPECTION_REPORT",
  "OTHER",
]);
export type ImportDocumentType = z.infer<typeof ImportDocumentTypeSchema>;

export const ShippingModeSchema = z.enum(["SEA", "AIR", "LAND", "COURIER"]);
export type ShippingMode = z.infer<typeof ShippingModeSchema>;

export const ImportShipmentLineDtoSchema = z.object({
  id: z.string(),
  shipmentId: z.string(),
  productId: z.string(),
  hsCode: z.string().nullable().optional(),
  orderedQty: z.number().int().positive(),
  receivedQty: z.number().int().nonnegative(),
  unitFobCostCents: z.number().int().nonnegative().nullable().optional(),
  lineFobCostCents: z.number().int().nonnegative().nullable().optional(),
  allocatedFreightCents: z.number().int().nonnegative().nullable().optional(),
  allocatedInsuranceCents: z.number().int().nonnegative().nullable().optional(),
  allocatedDutyCents: z.number().int().nonnegative().nullable().optional(),
  allocatedTaxCents: z.number().int().nonnegative().nullable().optional(),
  allocatedOtherCents: z.number().int().nonnegative().nullable().optional(),
  unitLandedCostCents: z.number().int().nonnegative().nullable().optional(),
  weightKg: z.number().nonnegative().nullable().optional(),
  volumeM3: z.number().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type ImportShipmentLineDto = z.infer<typeof ImportShipmentLineDtoSchema>;

export const ImportShipmentDocumentDtoSchema = z.object({
  id: z.string(),
  shipmentId: z.string(),
  documentType: ImportDocumentTypeSchema,
  documentNumber: z.string().nullable().optional(),
  documentName: z.string(),
  documentUrl: z.string().nullable().optional(),
  fileStorageKey: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  fileSizeBytes: z.number().int().nonnegative().nullable().optional(),
  uploadedByUserId: z.string().nullable().optional(),
  uploadedAt: utcInstantSchema,
  notes: z.string().nullable().optional(),
});
export type ImportShipmentDocumentDto = z.infer<typeof ImportShipmentDocumentDtoSchema>;

export const ImportShipmentDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  shipmentNumber: z.string().nullable().optional(),
  supplierPartyId: z.string(),
  status: ImportShipmentStatusSchema,
  shippingMode: ShippingModeSchema,
  containerNumber: z.string().nullable().optional(),
  sealNumber: z.string().nullable().optional(),
  billOfLadingNumber: z.string().nullable().optional(),
  carrierName: z.string().nullable().optional(),
  vesselName: z.string().nullable().optional(),
  voyageNumber: z.string().nullable().optional(),
  originCountry: z.string().nullable().optional(),
  originPort: z.string().nullable().optional(),
  destinationCountry: z.string().nullable().optional(),
  destinationPort: z.string().nullable().optional(),
  finalWarehouseId: z.string().nullable().optional(),
  departureDate: localDateSchema.nullable().optional(),
  estimatedArrivalDate: localDateSchema.nullable().optional(),
  actualArrivalDate: localDateSchema.nullable().optional(),
  clearanceDate: localDateSchema.nullable().optional(),
  receivedDate: localDateSchema.nullable().optional(),
  customsDeclarationNumber: z.string().nullable().optional(),
  importLicenseNumber: z.string().nullable().optional(),
  hsCodesPrimary: z.array(z.string()).optional(),
  incoterm: z.string().nullable().optional(),
  fobValueCents: z.number().int().nonnegative().nullable().optional(),
  freightCostCents: z.number().int().nonnegative().nullable().optional(),
  insuranceCostCents: z.number().int().nonnegative().nullable().optional(),
  customsDutyCents: z.number().int().nonnegative().nullable().optional(),
  customsTaxCents: z.number().int().nonnegative().nullable().optional(),
  otherCostsCents: z.number().int().nonnegative().nullable().optional(),
  totalLandedCostCents: z.number().int().nonnegative().nullable().optional(),
  totalWeightKg: z.number().nonnegative().nullable().optional(),
  totalVolumeM3: z.number().nonnegative().nullable().optional(),
  totalPackages: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
  metadataJson: z.record(z.any()).nullable().optional(),
  lines: z.array(ImportShipmentLineDtoSchema),
  documents: z.array(ImportShipmentDocumentDtoSchema).optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type ImportShipmentDto = z.infer<typeof ImportShipmentDtoSchema>;
