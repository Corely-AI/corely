import { z } from "zod";
import { localDateSchema } from "../shared/local-date.schema";
import { ImportShipmentDtoSchema, ShippingModeSchema } from "./import-shipment.types";

export const ImportShipmentLineInputSchema = z.object({
  productId: z.string(),
  hsCode: z.string().nullable().optional(),
  orderedQty: z.number().int().positive(),
  unitFobCostCents: z.number().int().nonnegative().nullable().optional(),
  weightKg: z.number().nonnegative().nullable().optional(),
  volumeM3: z.number().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const CreateShipmentInputSchema = z.object({
  supplierPartyId: z.string(),
  shippingMode: ShippingModeSchema.optional().default("SEA"),
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
  lines: z.array(ImportShipmentLineInputSchema).min(1),
});
export type CreateShipmentInput = z.infer<typeof CreateShipmentInputSchema>;

export const CreateShipmentOutputSchema = z.object({
  shipment: ImportShipmentDtoSchema,
});
export type CreateShipmentOutput = z.infer<typeof CreateShipmentOutputSchema>;
