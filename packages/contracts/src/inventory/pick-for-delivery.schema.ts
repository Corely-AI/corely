import { z } from "zod";

export const PickLineInputSchema = z.object({
  productId: z.string(),
  quantityRequested: z.number().int().positive(),
});

export const PickAllocationSchema = z.object({
  lotId: z.string(),
  lotNumber: z.string(),
  quantityPicked: z.number().int().positive(),
  expiryDate: z.string().nullable().optional(),
  unitCostCents: z.number().int().nonnegative().nullable().optional(),
});

export const PickLineResultSchema = z.object({
  productId: z.string(),
  quantityRequested: z.number().int().positive(),
  quantityAllocated: z.number().int().nonnegative(),
  shortfall: z.number().int().nonnegative(),
  allocations: z.array(PickAllocationSchema),
  weightedAverageCostCents: z.number().int().nonnegative().nullable().optional(),
});

export const PickForDeliveryInputSchema = z.object({
  warehouseId: z.string(),
  lines: z.array(PickLineInputSchema).min(1),
  strategy: z.enum(["FEFO", "FIFO", "MANUAL"]).optional().default("FEFO"),
});
export type PickForDeliveryInput = z.infer<typeof PickForDeliveryInputSchema>;

export const PickForDeliveryOutputSchema = z.object({
  picks: z.array(PickLineResultSchema),
  allocationSuccessful: z.boolean(),
});
export type PickForDeliveryOutput = z.infer<typeof PickForDeliveryOutputSchema>;
