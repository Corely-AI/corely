import { z } from "zod";
import { localDateSchema } from "../shared/local-date.schema";
import { ImportShipmentDtoSchema, ShippingModeSchema } from "./import-shipment.types";
import { ImportShipmentLineInputSchema } from "./create-shipment.schema";

export const UpdateShipmentInputSchema = z.object({
  shipmentId: z.string(),
  supplierPartyId: z.string().optional(),
  shippingMode: ShippingModeSchema.optional(),
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
  totalWeightKg: z.number().nonnegative().nullable().optional(),
  totalVolumeM3: z.number().nonnegative().nullable().optional(),
  totalPackages: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
  metadataJson: z.record(z.any()).nullable().optional(),
  lines: z.array(ImportShipmentLineInputSchema).optional(),
});
export type UpdateShipmentInput = z.infer<typeof UpdateShipmentInputSchema>;

export const UpdateShipmentOutputSchema = z.object({
  shipment: ImportShipmentDtoSchema,
});
export type UpdateShipmentOutput = z.infer<typeof UpdateShipmentOutputSchema>;
